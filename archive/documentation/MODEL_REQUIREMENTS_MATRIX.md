# Model Requirements and Dependencies Matrix

## Complete Model Inventory

### Video Generation Models

#### HunyuanVideo 1.5 Models
| Model File | Size | Type | Directory | URL |
|------------|------|------|-----------|-----|
| `hunyuanvideo1.5_720p_i2v_fp16.safetensors` | ~4.5GB | Diffusion | diffusion_models | [HF Link](https://huggingface.co/Comfy-Org/HunyuanVideo_1.5_repackaged/resolve/main/split_files/diffusion_models/hunyuanvideo1.5_720p_i2v_fp16.safetensors) |
| `hunyuanvideo1.5_720p_t2v_fp16.safetensors` | ~4.5GB | Diffusion | diffusion_models | [HF Link](https://huggingface.co/Comfy-Org/HunyuanVideo_1.5_repackaged/resolve/main/split_files/diffusion_models/hunyuanvideo1.5_720p_t2v_fp16.safetensors) |
| `hunyuanvideo1.5_1080p_sr_distilled_fp16.safetensors` | ~2.1GB | Super-Resolution | diffusion_models | [HF Link](https://huggingface.co/Comfy-Org/HunyuanVideo_1.5_repackaged/resolve/main/split_files/diffusion_models/hunyuanvideo1.5_1080p_sr_distilled_fp16.safetensors) |
| `hunyuanvideo15_vae_fp16.safetensors` | ~1.2GB | VAE | vae | [HF Link](https://huggingface.co/Comfy-Org/HunyuanVideo_1.5_repackaged/resolve/main/split_files/vae/hunyuanvideo15_vae_fp16.safetensors) |
| `hunyuanvideo15_latent_upsampler_1080p.safetensors` | ~500MB | Upsampler | latent_upscale_models | [HF Link](https://huggingface.co/Comfy-Org/HunyuanVideo_1.5_repackaged/resolve/main/split_files/latent_upscale_models/hunyuanvideo15_latent_upsampler_1080p.safetensors) |

#### Wan Video 2.2 Models
| Model File | Size | Type | Directory | URL |
|------------|------|------|-----------|-----|
| `wan2.2_fun_inpaint_high_noise_14B_fp8_scaled.safetensors` | ~14GB | Diffusion | diffusion_models | [Estimated HF Link] |
| `wan2.2_fun_inpaint_low_noise_14B_fp8_scaled.safetensors` | ~14GB | Diffusion | diffusion_models | [Estimated HF Link] |
| `wan2.1_t2v_14B_fp8_scaled.safetensors` | ~14GB | Diffusion | diffusion_models | [Estimated HF Link] |

#### Wan Video LoRA Adapters
| LoRA File | Size | Type | Directory | URL |
|-----------|------|------|-----------|-----|
| `wan2.2_i2v_lightx2v_4steps_lora_v1_high_noise.safetensors` | ~200MB | LoRA | loras | [Estimated HF Link] |
| `wan2.2_i2v_lightx2v_4steps_lora_v1_low_noise.safetensors` | ~200MB | LoRA | loras | [Estimated HF Link] |
| `wan_alpha_2.1_rgba_lora.safetensors` | ~200MB | LoRA | loras | [Estimated HF Link] |

### Image Generation Models

#### NewBie Image Models
| Model File | Size | Type | Directory | URL |
|------------|------|------|-----------|-----|
| `NewBie-Image-Exp0.1-bf16.safetensors` | ~2.5GB | Diffusion | diffusion_models | [Estimated HF Link] |
| `gemma_3_4b_it_bf16.safetensors` | ~8GB | Text Encoder | text_encoders | [Estimated HF Link] |
| `jina_clip_v2_bf16.safetensors` | ~1.5GB | CLIP Encoder | text_encoders | [Estimated HF Link] |
| `ae.safetensors` | ~300MB | VAE | vae | [Estimated HF Link] |

#### Qwen Image Models
| Model File | Size | Type | Directory | URL |
|------------|------|------|-----------|-----|
| `qwen_image_edit_2509_fp8_e4m3fn.safetensors` | ~7GB | Diffusion | diffusion_models | [Estimated HF Link] |
| `qwen_image_edit_2511_bf16.safetensors` | ~7GB | Diffusion | diffusion_models | [Estimated HF Link] |
| `qwen_image_layered_bf16.safetensors` | ~7GB | Diffusion | diffusion_models | [Estimated HF Link] |
| `qwen_2.5_vl_7b_fp8_scaled.safetensors` | ~7GB | Vision-Language | text_encoders | [HF Link](https://huggingface.co/Comfy-Org/HunyuanVideo_1.5_repackaged/resolve/main/split_files/text_encoders/qwen_2.5_vl_7b_fp8_scaled.safetensors) |
| `qwen_image_vae.safetensors` | ~300MB | VAE | vae | [Estimated HF Link] |
| `qwen_image_layered_vae.safetensors` | ~300MB | Layered VAE | vae | [Estimated HF Link] |

#### Qwen LoRA Adapters
| LoRA File | Size | Type | Directory | URL |
|-----------|------|------|-----------|-----|
| `Qwen-Image-Edit-2509-Relight.safetensors` | ~150MB | LoRA | loras | [Estimated HF Link] |
| `Qwen-Image-Edit-2509-Lightning-4steps-V1.0-bf16.safetensors` | ~150MB | LoRA | loras | [Estimated HF Link] |
| `Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16.safetensors` | ~150MB | LoRA | loras | [Estimated HF Link] |

### Shared Models

#### Text Encoders (Shared)
| Model File | Size | Type | Directory | Used By |
|------------|------|------|-----------|---------|
| `qwen_2.5_vl_7b_fp8_scaled.safetensors` | ~7GB | Vision-Language | text_encoders | HunyuanVideo, Qwen Image |
| `byt5_small_glyphxl_fp16.safetensors` | ~1GB | Text | text_encoders | HunyuanVideo |

#### CLIP Vision Models
| Model File | Size | Type | Directory | Used By |
|------------|------|------|-----------|---------|
| `sigclip_vision_patch14_384.safetensors` | ~600MB | CLIP Vision | clip_vision | HunyuanVideo |

## Storage Requirements Summary

### By Category
| Category | Total Size | Model Count | Notes |
|----------|------------|-------------|-------|
| Video Diffusion Models | ~53GB | 5 | Includes 14B parameter models |
| Image Diffusion Models | ~23.5GB | 4 | Various specializations |
| Text Encoders | ~17.5GB | 4 | Shared across workflows |
| VAE Models | ~2.6GB | 5 | Encoding/decoding |
| LoRA Adapters | ~1.2GB | 6 | Fast inference acceleration |
| CLIP Vision | ~600MB | 1 | Image understanding |
| Auxiliary Models | ~500MB | 1 | Upsampling |

### Total Storage Requirements
- **Core Models:** ~98GB
- **With Redundancy (20%):** ~118GB
- **Recommended Free Space:** ~150GB
- **Enterprise Deployment:** ~200GB (with model variants)

## Memory Usage Patterns

### VRAM Usage by Workflow

#### Video Workflows
| Workflow | Base Model | Text Encoders | VAE | Total VRAM | Peak Usage |
|----------|------------|---------------|-----|------------|------------|
| HunyuanVideo I2V 720p | 8GB | 4GB | 2GB | 14GB | 16GB |
| HunyuanVideo I2V 1080p | 8GB + 4GB | 4GB | 2GB | 18GB | 22GB |
| HunyuanVideo T2V 720p | 8GB | 4GB | 2GB | 14GB | 16GB |
| Wan Inpaint (High+Low) | 16GB | 2GB | 2GB | 20GB | 24GB |
| Wan Alpha | 16GB | 2GB | 2GB | 20GB | 24GB |

#### Image Workflows
| Workflow | Base Model | Text Encoders | VAE | Total VRAM | Peak Usage |
|----------|------------|---------------|-----|------------|------------|
| NewBie Anime | 4GB | 6GB | 1GB | 11GB | 13GB |
| Qwen Relight | 6GB | 4GB | 1GB | 11GB | 13GB |
| Qwen Edit 2511 | 6GB | 4GB | 1GB | 11GB | 13GB |
| Qwen Layered | 6GB | 4GB | 1GB | 11GB | 13GB |

### Memory Optimization Strategies

#### Model Sharing Opportunities
```python
# Shared text encoders reduce memory usage
shared_encoders = {
    'qwen_2.5_vl_7b': ['hunyuan_i2v', 'hunyuan_t2v', 'qwen_relight', 'qwen_edit', 'qwen_layered'],
    'byt5_small': ['hunyuan_i2v', 'hunyuan_t2v']
}

# Memory savings through sharing
memory_savings = {
    'qwen_encoder_sharing': '7GB saved across 5 workflows',
    'byt5_encoder_sharing': '1GB saved across 2 workflows',
    'total_potential_savings': '8GB through intelligent sharing'
}
```

#### Dynamic Loading Strategy
```python
class MemoryOptimizedLoader:
    def __init__(self, max_vram_gb=24):
        self.max_vram = max_vram_gb * 1024**3  # Convert to bytes
        self.loaded_models = {}
        self.memory_usage = 0
    
    def load_workflow_models(self, workflow_name):
        required_models = self.get_workflow_requirements(workflow_name)
        
        # Unload models if necessary
        if self.predict_memory_usage(required_models) > self.max_vram:
            self.unload_least_recently_used()
        
        # Load required models
        for model_name in required_models:
            if model_name not in self.loaded_models:
                self.load_model(model_name)
```

## Hardware Compatibility Matrix

### GPU Requirements by Use Case

#### Consumer Hardware (16GB VRAM)
| GPU Model | Supported Workflows | Limitations | Recommendations |
|-----------|-------------------|-------------|-----------------|
| RTX 4080 (16GB) | HunyuanVideo 720p, All Image | No 1080p upscaling, No Wan 14B | Use FP8 quantization |
| RTX 4090 (24GB) | All workflows | None | Optimal performance |
| RTX 3090 (24GB) | All workflows | Slower inference | Good compatibility |

#### Professional Hardware (24GB+ VRAM)
| GPU Model | Supported Workflows | Performance | Use Case |
|-----------|-------------------|-------------|----------|
| RTX 4090 (24GB) | All workflows | Excellent | Professional content creation |
| RTX 6000 Ada (48GB) | All workflows + batching | Outstanding | Studio production |
| A100 (40GB/80GB) | All workflows + large batches | Maximum | Enterprise deployment |
| H100 (80GB) | All workflows + research | Cutting-edge | Research and development |

#### Memory Configuration Recommendations
```python
hardware_configs = {
    'consumer_16gb': {
        'max_concurrent_workflows': 1,
        'recommended_workflows': ['hunyuan_720p', 'newbie_anime', 'qwen_edit'],
        'optimizations': ['fp8_quantization', 'model_offloading']
    },
    'prosumer_24gb': {
        'max_concurrent_workflows': 2,
        'recommended_workflows': 'all',
        'optimizations': ['model_sharing', 'batch_processing']
    },
    'enterprise_40gb_plus': {
        'max_concurrent_workflows': 4,
        'recommended_workflows': 'all',
        'optimizations': ['parallel_processing', 'model_variants']
    }
}
```

## Dependency Management

### ComfyUI Version Requirements
```yaml
comfyui_compatibility:
  minimum_version: "0.3.68"
  recommended_version: "0.3.70"
  tested_versions: ["0.3.68", "0.3.69", "0.3.70"]
  breaking_changes:
    - "0.3.68": "Initial support for HunyuanVideo nodes"
    - "0.3.70": "Enhanced VAE decoding, latent upscaling"
```

### Python Package Dependencies
```python
required_packages = {
    'torch': '>=2.0.0',
    'torchvision': '>=0.15.0',
    'transformers': '>=4.30.0',
    'diffusers': '>=0.20.0',
    'safetensors': '>=0.3.0',
    'pillow': '>=9.0.0',
    'numpy': '>=1.21.0',
    'opencv-python': '>=4.5.0'
}

optional_packages = {
    'xformers': '>=0.0.20',  # Memory optimization
    'flash-attn': '>=2.0.0',  # Attention optimization
    'bitsandbytes': '>=0.40.0',  # Quantization
    'accelerate': '>=0.20.0'  # Multi-GPU support
}
```

### Model Download Strategy
```python
class ModelDownloadManager:
    def __init__(self):
        self.base_urls = {
            'hunyuan': 'https://huggingface.co/Comfy-Org/HunyuanVideo_1.5_repackaged/resolve/main/split_files/',
            'sigclip': 'https://huggingface.co/Comfy-Org/sigclip_vision_384/resolve/main/',
            'wan': 'https://huggingface.co/Comfy-Org/Wan-Video-2.2/resolve/main/',  # Estimated
            'qwen': 'https://huggingface.co/Comfy-Org/Qwen-Image-Suite/resolve/main/',  # Estimated
            'newbie': 'https://huggingface.co/Comfy-Org/NewBie-Image/resolve/main/'  # Estimated
        }
    
    def download_workflow_models(self, workflow_name):
        """Download all models required for a specific workflow"""
        required_models = self.get_workflow_requirements(workflow_name)
        
        for model_info in required_models:
            if not self.is_model_available(model_info['name']):
                self.download_model(model_info)
                self.verify_model_integrity(model_info)
    
    def verify_model_integrity(self, model_info):
        """Verify downloaded model using checksums"""
        # Implementation for SHA256 verification
        pass
```

## Integration Checkpoints

### Phase 1 Validation (Foundation)
- [ ] Model download system functional
- [ ] Basic workflow registry operational
- [ ] Memory management system working
- [ ] One workflow (HunyuanVideo I2V) fully integrated

### Phase 2 Validation (Core Integration)
- [ ] Video engine integration complete
- [ ] Image engine integration complete
- [ ] Workflow routing system operational
- [ ] Performance benchmarks met

### Phase 3 Validation (Advanced Features)
- [ ] All 8 workflows integrated
- [ ] Quality monitoring system active
- [ ] Memory optimization effective
- [ ] User acceptance testing passed

### Phase 4 Validation (Production Ready)
- [ ] Comprehensive testing complete
- [ ] Documentation finalized
- [ ] Deployment procedures validated
- [ ] Monitoring and alerting operational

---

*This matrix provides the detailed technical foundation for model management and hardware planning in the advanced ComfyUI workflow integration project.*