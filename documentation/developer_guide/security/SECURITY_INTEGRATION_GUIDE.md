# Security System Integration Guide

## Overview

This guide explains how to integrate the Security and Validation System with existing StoryCore-Engine components.

## Table of Contents

1. [Video Engine Integration](#video-engine-integration)
2. [Image Engine Integration](#image-engine-integration)
3. [Model Manager Integration](#model-manager-integration)
4. [CLI Integration](#cli-integration)
5. [Configuration Integration](#configuration-integration)
6. [Testing Integration](#testing-integration)

## Video Engine Integration

### Complete HunyuanVideo Integration Example

This example shows how to integrate security with the HunyuanVideo engine for both text-to-video and image-to-video workflows.

#### Step 1: Import Security System

```python
# In src/hunyuan_video_integration_resilient.py
from src.security_validation_system import (
    SecurityValidationSystem,
    SecurityLevel,
    ValidationError
)
```

#### Step 2: Initialize in Constructor

```python
class HunyuanVideoIntegration:
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        # Existing initialization
        self.config = config or {}
        self.model_manager = AdvancedModelManager()
        
        # Add security system
        self.security = SecurityValidationSystem()
        
        # Configure access control for HunyuanVideo workflows
        self.security.access_control.add_custom_permission(
            'hunyuan_text_to_video',
            {SecurityLevel.AUTHENTICATED, SecurityLevel.PRIVILEGED, SecurityLevel.ADMIN}
        )
        self.security.access_control.add_custom_permission(
            'hunyuan_image_to_video',
            {SecurityLevel.AUTHENTICATED, SecurityLevel.PRIVILEGED, SecurityLevel.ADMIN}
        )
        
        logger.info("HunyuanVideo integration initialized with security")
```

#### Step 3: Validate Text-to-Video Requests

```python
async def generate_text_to_video(
    self,
    prompt: str,
    resolution: str = "720p",
    duration: int = 5,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Generate video from text with security validation"""
    
    # Build request for validation
    request = {
        'workflow_type': 'hunyuan_text_to_video',
        'prompt': prompt
    }
    
    # Validate request
    is_valid, results = self.security.validate_workflow_request(request, user_id)
    
    if not is_valid:
        error_messages = [r.message for r in results if not r.is_valid]
        raise ValidationError(f"Request validation failed: {'; '.join(error_messages)}")
    
    # Log workflow start
    self.security.audit_logger.log_workflow_execution(
        user_id=user_id,
        workflow_type='hunyuan_text_to_video',
        success=False,
        details={
            'status': 'started',
            'resolution': resolution,
            'duration': duration
        }
    )
    
    try:
        # Generate video
        result = await self._generate_text_to_video_internal(prompt, resolution, duration)
        
        # Log success
        self.security.audit_logger.log_workflow_execution(
            user_id=user_id,
            workflow_type='hunyuan_text_to_video',
            success=True,
            details={
                'video_path': result['video_path'],
                'duration': result['duration'],
                'resolution': resolution
            }
        )
        
        return result
        
    except Exception as e:
        # Log failure
        self.security.audit_logger.log_workflow_execution(
            user_id=user_id,
            workflow_type='hunyuan_text_to_video',
            success=False,
            details={'error': str(e)}
        )
        raise
```

#### Step 4: Validate Image-to-Video Requests

```python
async def generate_image_to_video(
    self,
    image_path: str,
    prompt: str,
    resolution: str = "720p",
    duration: int = 5,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Generate video from image with security validation"""
    
    # Validate image file
    image_result = self.security.input_validator.validate_image_input(image_path)
    if not image_result.is_valid:
        raise ValidationError(f"Invalid image: {image_result.message}")
    
    # Build request for validation
    request = {
        'workflow_type': 'hunyuan_image_to_video',
        'prompt': prompt,
        'image_path': image_path
    }
    
    # Validate request
    is_valid, results = self.security.validate_workflow_request(request, user_id)
    
    if not is_valid:
        error_messages = [r.message for r in results if not r.is_valid]
        raise ValidationError(f"Request validation failed: {'; '.join(error_messages)}")
    
    # Log workflow start
    self.security.audit_logger.log_workflow_execution(
        user_id=user_id,
        workflow_type='hunyuan_image_to_video',
        success=False,
        details={
            'status': 'started',
            'image_path': image_path,
            'resolution': resolution,
            'duration': duration
        }
    )
    
    try:
        # Generate video
        result = await self._generate_image_to_video_internal(
            image_path, prompt, resolution, duration
        )
        
        # Log success
        self.security.audit_logger.log_workflow_execution(
            user_id=user_id,
            workflow_type='hunyuan_image_to_video',
            success=True,
            details={
                'video_path': result['video_path'],
                'duration': result['duration'],
                'resolution': resolution
            }
        )
        
        return result
        
    except Exception as e:
        # Log failure
        self.security.audit_logger.log_workflow_execution(
            user_id=user_id,
            workflow_type='hunyuan_image_to_video',
            success=False,
            details={'error': str(e)}
        )
        raise
```

### Complete Wan ATI Integration Example

This example shows how to integrate security with the Wan ATI engine for trajectory-based video generation.

```python
# In src/wan_video_integration_resilient.py
from src.security_validation_system import (
    SecurityValidationSystem,
    SecurityLevel,
    ValidationError
)

class WanVideoIntegration:
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.security = SecurityValidationSystem()
        
        # Configure access control
        self.security.access_control.add_custom_permission(
            'wan_ati_trajectory',
            {SecurityLevel.AUTHENTICATED, SecurityLevel.PRIVILEGED, SecurityLevel.ADMIN}
        )
    
    async def generate_trajectory_video(
        self,
        image_path: str,
        trajectory: List[List[Dict[str, float]]],
        prompt: str,
        resolution: str = "480p",
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate video with trajectory control and security validation"""
        
        # Validate image
        image_result = self.security.input_validator.validate_image_input(image_path)
        if not image_result.is_valid:
            raise ValidationError(f"Invalid image: {image_result.message}")
        
        # Validate trajectory
        trajectory_result = self.security.input_validator.validate_trajectory_json(trajectory)
        if not trajectory_result.is_valid:
            raise ValidationError(f"Invalid trajectory: {trajectory_result.message}")
        
        # Build request for validation
        request = {
            'workflow_type': 'wan_ati_trajectory',
            'prompt': prompt,
            'image_path': image_path,
            'trajectory': trajectory
        }
        
        # Validate complete request
        is_valid, results = self.security.validate_workflow_request(request, user_id)
        
        if not is_valid:
            error_messages = [r.message for r in results if not r.is_valid]
            raise ValidationError(f"Request validation failed: {'; '.join(error_messages)}")
        
        # Log workflow start
        self.security.audit_logger.log_workflow_execution(
            user_id=user_id,
            workflow_type='wan_ati_trajectory',
            success=False,
            details={
                'status': 'started',
                'num_trajectories': len(trajectory),
                'resolution': resolution
            }
        )
        
        try:
            # Generate video
            result = await self._generate_trajectory_video_internal(
                image_path, trajectory, prompt, resolution
            )
            
            # Log success
            self.security.audit_logger.log_workflow_execution(
                user_id=user_id,
                workflow_type='wan_ati_trajectory',
                success=True,
                details={
                    'video_path': result['video_path'],
                    'num_trajectories': len(trajectory),
                    'resolution': resolution
                }
            )
            
            return result
            
        except Exception as e:
            # Log failure
            self.security.audit_logger.log_workflow_execution(
                user_id=user_id,
                workflow_type='wan_ati_trajectory',
                success=False,
                details={'error': str(e)}
            )
            raise
```

### Step 3: Validate Requests

```python
async def generate_video(self, request: Dict[str, Any], user_id: Optional[str] = None) -> VideoResult:
    """Generate video with security validation"""
    
    # Validate request
    is_valid, results = self.security.validate_workflow_request(request, user_id)
    
    if not is_valid:
        # Log validation failure
        error_messages = [r.message for r in results if not r.is_valid]
        raise ValidationError(f"Request validation failed: {'; '.join(error_messages)}")
    
    # Log workflow execution start
    self.security.audit_logger.log_workflow_execution(
        user_id=user_id,
        workflow_type=request.get('workflow_type', 'video_generation'),
        success=False,  # Will update on completion
        details={'status': 'started'}
    )
    
    try:
        # Existing video generation logic
        result = await self._generate_video_internal(request)
        
        # Log success
        self.security.audit_logger.log_workflow_execution(
            user_id=user_id,
            workflow_type=request.get('workflow_type', 'video_generation'),
            success=True,
            details={'duration': result.duration, 'resolution': result.resolution}
        )
        
        return result
        
    except Exception as e:
        # Log failure
        self.security.audit_logger.log_workflow_execution(
            user_id=user_id,
            workflow_type=request.get('workflow_type', 'video_generation'),
            success=False,
            details={'error': str(e)}
        )
        raise
```

### Step 4: Validate Trajectory Input (for Wan ATI)

```python
async def generate_trajectory_video(self, image_path: str, trajectory: List[Dict], 
                                   prompt: str, user_id: Optional[str] = None) -> VideoResult:
    """Generate video with trajectory control"""
    
    # Validate trajectory
    trajectory_result = self.security.input_validator.validate_trajectory_json(trajectory)
    if not trajectory_result.is_valid:
        raise ValidationError(f"Invalid trajectory: {trajectory_result.message}")
    
    # Validate image
    image_result = self.security.input_validator.validate_image_input(image_path)
    if not image_result.is_valid:
        raise ValidationError(f"Invalid image: {image_result.message}")
    
    # Validate prompt
    prompt_result = self.security.input_validator.validate_text_prompt(prompt)
    if not prompt_result.is_valid:
        raise ValidationError(f"Invalid prompt: {prompt_result.message}")
    
    # Proceed with generation
    return await self._generate_trajectory_video_internal(image_path, trajectory, prompt)
```

## Image Engine Integration

### Complete Qwen Image Edit Integration Example

This example shows how to integrate security with the Qwen image editing engine.

#### Step 1: Import and Initialize

```python
# In src/qwen_image_integration.py
from src.security_validation_system import (
    SecurityValidationSystem,
    SecurityLevel,
    ValidationError
)

class QwenImageIntegration:
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.security = SecurityValidationSystem()
        
        # Configure access control for Qwen workflows
        self.security.access_control.add_custom_permission(
            'qwen_image_edit',
            {SecurityLevel.AUTHENTICATED, SecurityLevel.PRIVILEGED, SecurityLevel.ADMIN}
        )
        self.security.access_control.add_custom_permission(
            'qwen_layered_edit',
            {SecurityLevel.AUTHENTICATED, SecurityLevel.PRIVILEGED, SecurityLevel.ADMIN}
        )
        
        logger.info("Qwen image integration initialized with security")
```

#### Step 2: Validate Image Edit Requests

```python
async def edit_image(
    self,
    base_image: str,
    edit_prompt: str,
    reference_images: Optional[List[str]] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Edit image with security validation"""
    
    # Validate base image
    base_result = self.security.input_validator.validate_image_input(base_image)
    if not base_result.is_valid:
        raise ValidationError(f"Invalid base image: {base_result.message}")
    
    # Validate reference images if provided
    if reference_images:
        for ref_img in reference_images:
            ref_result = self.security.input_validator.validate_image_input(ref_img)
            if not ref_result.is_valid:
                raise ValidationError(f"Invalid reference image {ref_img}: {ref_result.message}")
    
    # Build request for validation
    request = {
        'workflow_type': 'qwen_image_edit',
        'prompt': edit_prompt,
        'image_path': base_image
    }
    
    # Validate request
    is_valid, results = self.security.validate_workflow_request(request, user_id)
    
    if not is_valid:
        error_messages = [r.message for r in results if not r.is_valid]
        raise ValidationError(f"Request validation failed: {'; '.join(error_messages)}")
    
    # Sanitize prompt to prevent injection
    safe_prompt = self.security.data_sanitizer.sanitize_html(edit_prompt)
    
    # Log workflow start
    self.security.audit_logger.log_workflow_execution(
        user_id=user_id,
        workflow_type='qwen_image_edit',
        success=False,
        details={
            'status': 'started',
            'base_image': base_image,
            'num_references': len(reference_images) if reference_images else 0
        }
    )
    
    try:
        # Edit image
        result = await self._edit_image_internal(
            base_image, safe_prompt, reference_images
        )
        
        # Log success
        self.security.audit_logger.log_workflow_execution(
            user_id=user_id,
            workflow_type='qwen_image_edit',
            success=True,
            details={
                'output_image': result['image_path'],
                'resolution': result['resolution']
            }
        )
        
        return result
        
    except Exception as e:
        # Log failure
        self.security.audit_logger.log_workflow_execution(
            user_id=user_id,
            workflow_type='qwen_image_edit',
            success=False,
            details={'error': str(e)}
        )
        raise
```

#### Step 3: Validate Layered Edit Requests

```python
async def layered_edit(
    self,
    base_image: str,
    layers: List[Dict[str, Any]],
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Perform layered image editing with security validation"""
    
    # Validate base image
    base_result = self.security.input_validator.validate_image_input(base_image)
    if not base_result.is_valid:
        raise ValidationError(f"Invalid base image: {base_result.message}")
    
    # Validate each layer
    for i, layer in enumerate(layers):
        # Validate layer prompt
        if 'prompt' in layer:
            prompt_result = self.security.input_validator.validate_text_prompt(layer['prompt'])
            if not prompt_result.is_valid:
                raise ValidationError(f"Invalid prompt in layer {i}: {prompt_result.message}")
            
            # Sanitize prompt
            layer['prompt'] = self.security.data_sanitizer.sanitize_html(layer['prompt'])
        
        # Validate layer image if present
        if 'image' in layer:
            img_result = self.security.input_validator.validate_image_input(layer['image'])
            if not img_result.is_valid:
                raise ValidationError(f"Invalid image in layer {i}: {img_result.message}")
    
    # Build request for validation
    request = {
        'workflow_type': 'qwen_layered_edit',
        'prompt': f"Layered edit with {len(layers)} layers",
        'image_path': base_image
    }
    
    # Validate request
    is_valid, results = self.security.validate_workflow_request(request, user_id)
    
    if not is_valid:
        error_messages = [r.message for r in results if not r.is_valid]
        raise ValidationError(f"Request validation failed: {'; '.join(error_messages)}")
    
    # Log workflow start
    self.security.audit_logger.log_workflow_execution(
        user_id=user_id,
        workflow_type='qwen_layered_edit',
        success=False,
        details={
            'status': 'started',
            'base_image': base_image,
            'num_layers': len(layers)
        }
    )
    
    try:
        # Perform layered edit
        result = await self._layered_edit_internal(base_image, layers)
        
        # Log success
        self.security.audit_logger.log_workflow_execution(
            user_id=user_id,
            workflow_type='qwen_layered_edit',
            success=True,
            details={
                'output_image': result['image_path'],
                'num_layers': len(layers)
            }
        )
        
        return result
        
    except Exception as e:
        # Log failure
        self.security.audit_logger.log_workflow_execution(
            user_id=user_id,
            workflow_type='qwen_layered_edit',
            success=False,
            details={'error': str(e)}
        )
        raise
```

### Complete Flux Image Generation Integration Example

```python
# In src/flux_image_integration.py
from src.security_validation_system import (
    SecurityValidationSystem,
    SecurityLevel,
    ValidationError
)

class FluxImageIntegration:
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.security = SecurityValidationSystem()
        
        # Configure access control
        self.security.access_control.add_custom_permission(
            'flux_text_to_image',
            {SecurityLevel.AUTHENTICATED, SecurityLevel.PRIVILEGED, SecurityLevel.ADMIN}
        )
    
    async def generate_image(
        self,
        prompt: str,
        negative_prompt: Optional[str] = None,
        resolution: str = "1024x1024",
        style: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate image with security validation"""
        
        # Build request for validation
        request = {
            'workflow_type': 'flux_text_to_image',
            'prompt': prompt
        }
        
        # Validate request
        is_valid, results = self.security.validate_workflow_request(request, user_id)
        
        if not is_valid:
            error_messages = [r.message for r in results if not r.is_valid]
            raise ValidationError(f"Request validation failed: {'; '.join(error_messages)}")
        
        # Sanitize prompts
        safe_prompt = self.security.data_sanitizer.sanitize_html(prompt)
        safe_negative_prompt = None
        if negative_prompt:
            neg_result = self.security.input_validator.validate_text_prompt(negative_prompt)
            if not neg_result.is_valid:
                raise ValidationError(f"Invalid negative prompt: {neg_result.message}")
            safe_negative_prompt = self.security.data_sanitizer.sanitize_html(negative_prompt)
        
        # Log workflow start
        self.security.audit_logger.log_workflow_execution(
            user_id=user_id,
            workflow_type='flux_text_to_image',
            success=False,
            details={
                'status': 'started',
                'resolution': resolution,
                'style': style
            }
        )
        
        try:
            # Generate image
            result = await self._generate_image_internal(
                safe_prompt, safe_negative_prompt, resolution, style
            )
            
            # Log success
            self.security.audit_logger.log_workflow_execution(
                user_id=user_id,
                workflow_type='flux_text_to_image',
                success=True,
                details={
                    'image_path': result['image_path'],
                    'resolution': resolution
                }
            )
            
            return result
            
        except Exception as e:
            # Log failure
            self.security.audit_logger.log_workflow_execution(
                user_id=user_id,
                workflow_type='flux_text_to_image',
                success=False,
                details={'error': str(e)}
            )
            raise
```

### Step 2: Validate Image Generation Requests

```python
async def generate_image(self, request: Dict[str, Any], user_id: Optional[str] = None) -> ImageResult:
    """Generate image with security validation"""
    
    # Validate request
    is_valid, results = self.security.validate_workflow_request(request, user_id)
    
    if not is_valid:
        error_messages = [r.message for r in results if not r.is_valid]
        raise ValidationError(f"Request validation failed: {'; '.join(error_messages)}")
    
    # Sanitize prompt to prevent injection
    safe_prompt = self.security.data_sanitizer.sanitize_html(request['prompt'])
    request['prompt'] = safe_prompt
    
    # Log execution
    self.security.audit_logger.log_workflow_execution(
        user_id=user_id,
        workflow_type=request.get('workflow_type', 'image_generation'),
        success=False,
        details={'status': 'started'}
    )
    
    try:
        result = await self._generate_image_internal(request)
        
        # Log success
        self.security.audit_logger.log_workflow_execution(
            user_id=user_id,
            workflow_type=request.get('workflow_type', 'image_generation'),
            success=True,
            details={'resolution': result.resolution, 'format': result.format}
        )
        
        return result
        
    except Exception as e:
        # Log failure
        self.security.audit_logger.log_workflow_execution(
            user_id=user_id,
            workflow_type=request.get('workflow_type', 'image_generation'),
            success=False,
            details={'error': str(e)}
        )
        raise
```

### Step 3: Validate Reference Images (for Qwen)

```python
async def edit_image_with_references(self, base_image: str, reference_images: List[str],
                                    edit_prompt: str, user_id: Optional[str] = None) -> ImageResult:
    """Edit image with reference images"""
    
    # Validate all images
    for img_path in [base_image] + reference_images:
        result = self.security.input_validator.validate_image_input(img_path)
        if not result.is_valid:
            raise ValidationError(f"Invalid image {img_path}: {result.message}")
    
    # Validate prompt
    prompt_result = self.security.input_validator.validate_text_prompt(edit_prompt)
    if not prompt_result.is_valid:
        raise ValidationError(f"Invalid prompt: {prompt_result.message}")
    
    # Proceed with editing
    return await self._edit_image_internal(base_image, reference_images, edit_prompt)
```

## Model Manager Integration

### Step 1: Integrate with Model Loading

```python
# In src/advanced_model_manager.py
from src.security_validation_system import SecurityValidationSystem

class AdvancedModelManager:
    def __init__(self, config: ModelManagerConfig):
        self.config = config
        self.security = SecurityValidationSystem()
        self.model_cache = {}
    
    async def load_model(self, model_name: str, model_path: Path, 
                        user_id: Optional[str] = None) -> torch.nn.Module:
        """Load model with integrity verification"""
        
        # Check access permission
        access_result = self.security.access_control.check_permission(user_id, 'model_management')
        if not access_result.is_valid:
            raise PermissionError(f"Access denied: {access_result.message}")
        
        # Verify model integrity
        integrity_result = self.security.validate_model_file(model_path)
        if not integrity_result.is_valid:
            if integrity_result.severity == ValidationSeverity.CRITICAL:
                raise ModelIntegrityError(f"Model integrity check failed: {integrity_result.message}")
            else:
                # Warning only, proceed with caution
                logger.warning(f"Model integrity warning: {integrity_result.message}")
        
        # Load model
        model = await self._load_model_internal(model_path)
        
        # Cache model
        self.model_cache[model_name] = model
        
        return model
```

### Step 2: Secure Model Downloads

```python
async def download_model(self, model_name: str, url: str, 
                        user_id: Optional[str] = None) -> Path:
    """Download model with security validation"""
    
    # Validate download URL
    url_result = self.security.validate_download_request(url, user_id)
    if not url_result.is_valid:
        raise SecurityError(f"Download blocked: {url_result.message}")
    
    # Log download attempt
    self.security.audit_logger.log_model_download(user_id, model_name, url, False)
    
    try:
        # Download model
        model_path = await self._download_model_internal(url, model_name)
        
        # Register checksum
        self.security.model_integrity_checker.register_model_checksum(model_path)
        
        # Log success
        self.security.audit_logger.log_model_download(user_id, model_name, url, True)
        
        return model_path
        
    except Exception as e:
        # Log failure
        self.security.audit_logger.log_model_download(user_id, model_name, url, False)
        raise
```

## CLI Integration

### Step 1: Add Security Options

```python
# In src/enhanced_video_cli.py or storycore.py
import argparse
from src.security_validation_system import SecurityLevel

def create_parser():
    parser = argparse.ArgumentParser(description='StoryCore-Engine with Security')
    
    # Existing arguments
    parser.add_argument('--project', type=str, help='Project name')
    parser.add_argument('--prompt', type=str, help='Generation prompt')
    
    # Security arguments
    parser.add_argument('--user-id', type=str, help='User ID for audit logging')
    parser.add_argument('--user-level', type=str, 
                       choices=['public', 'authenticated', 'privileged', 'admin'],
                       default='authenticated',
                       help='User security level')
    parser.add_argument('--validate-only', action='store_true',
                       help='Validate request without executing')
    parser.add_argument('--security-report', action='store_true',
                       help='Generate security report')
    
    return parser
```

### Step 2: Implement Security Commands

```python
def main():
    parser = create_parser()
    args = parser.parse_args()
    
    # Initialize security
    security = SecurityValidationSystem()
    
    # Set user level
    if args.user_id:
        level_map = {
            'public': SecurityLevel.PUBLIC,
            'authenticated': SecurityLevel.AUTHENTICATED,
            'privileged': SecurityLevel.PRIVILEGED,
            'admin': SecurityLevel.ADMIN
        }
        security.access_control.set_user_level(args.user_id, level_map[args.user_level])
    
    # Security report command
    if args.security_report:
        report = security.get_security_report()
        print(json.dumps(report, indent=2))
        return
    
    # Build request
    request = {
        'workflow_type': 'advanced_video',
        'prompt': args.prompt,
        'project': args.project
    }
    
    # Validate request
    is_valid, results = security.validate_workflow_request(request, args.user_id)
    
    if not is_valid:
        print("❌ Validation failed:")
        for result in results:
            if not result.is_valid:
                print(f"  [{result.severity.value}] {result.message}")
        sys.exit(1)
    
    if args.validate_only:
        print("✓ Validation passed")
        return
    
    # Execute workflow
    execute_workflow(request, args.user_id)
```

## Configuration Integration

### Complete Configuration Example

This section shows how to configure security across all components with a comprehensive configuration file.

#### Step 1: Configuration File Structure

```yaml
# config/storycore_config.yaml

# Project Information
project:
  name: "StoryCore-Engine"
  version: "1.1-production"
  environment: "production"  # development, staging, production

# Model Settings
models:
  precision: "fp16"
  cache_dir: "models/cache"
  download_timeout: 300  # seconds

# Security Settings
security:
  # Input Validation
  input_validation:
    max_prompt_length: 10000
    max_image_size_mb: 50.0
    max_video_size_mb: 500.0
    allowed_image_formats:
      - .jpg
      - .jpeg
      - .png
      - .webp
      - .bmp
    allowed_video_formats:
      - .mp4
      - .avi
      - .mov
      - .mkv
      - .webm
    dangerous_patterns:
      - '<script[^>]*>.*?</script>'
      - 'javascript:'
      - 'on\w+\s*='
      - 'eval\s*\('
      - 'exec\s*\('
  
  # Model Security
  model_security:
    enable_integrity_checking: true
    checksum_file: "models/checksums.json"
    checksum_algorithm: "sha256"
    auto_register_new_models: true
  
  # Access Control
  access_control:
    enable: true
    default_user_level: "authenticated"  # public, authenticated, privileged, admin
    
    # Resource permissions
    permissions:
      basic_generation:
        - public
        - authenticated
        - privileged
        - admin
      
      advanced_video:
        - authenticated
        - privileged
        - admin
      
      advanced_image:
        - authenticated
        - privileged
        - admin
      
      model_management:
        - privileged
        - admin
      
      system_configuration:
        - admin
      
      audit_logs:
        - admin
    
    # Custom workflow permissions
    custom_permissions:
      hunyuan_text_to_video:
        - authenticated
        - privileged
        - admin
      
      hunyuan_image_to_video:
        - authenticated
        - privileged
        - admin
      
      wan_ati_trajectory:
        - authenticated
        - privileged
        - admin
      
      qwen_image_edit:
        - authenticated
        - privileged
        - admin
      
      flux_text_to_image:
        - authenticated
        - privileged
        - admin
  
  # Audit Logging
  audit_logging:
    enable: true
    log_file: "logs/security_audit.jsonl"
    log_format: "jsonl"  # jsonl, json, csv
    max_log_size_mb: 100
    rotate_logs: true
    retention_days: 90
    
    # What to log
    log_events:
      workflow_execution: true
      model_downloads: true
      access_attempts: true
      validation_failures: true
      security_errors: true
    
    # Log levels
    log_levels:
      info: true
      warning: true
      error: true
      critical: true
  
  # Privacy Protection
  privacy:
    enable_pii_detection: true
    enable_pii_redaction: false  # Set to true to auto-redact
    pii_replacement: "[REDACTED]"
    
    # PII types to detect
    detect_pii_types:
      - email
      - phone
      - ssn
      - credit_card
      - ip_address
    
    # Anonymization for analytics
    anonymize_user_data: true
    anonymization_fields:
      - user_id
      - email
      - ip_address
      - session_id
  
  # Secure Downloads
  downloads:
    enable_url_validation: true
    allowed_domains:
      - huggingface.co
      - civitai.com
      - github.com
      - githubusercontent.com
    max_download_size_gb: 50.0
    download_timeout: 600  # seconds
    verify_ssl: true
  
  # Data Sanitization
  sanitization:
    enable_html_sanitization: true
    enable_sql_sanitization: true
    enable_path_sanitization: true

# Error Handling Settings
error_handling:
  # Retry Mechanism
  retry:
    enable: true
    max_attempts: 3
    initial_delay: 1.0
    max_delay: 60.0
    exponential_base: 2.0
    jitter: true
  
  # Circuit Breaker
  circuit_breaker:
    enable: true
    failure_threshold: 5
    success_threshold: 2
    timeout: 60.0
    half_open_max_calls: 1
  
  # Graceful Degradation
  degradation:
    enable: true
    levels:
      - full
      - high
      - medium
      - low
      - minimal

# Monitoring Settings
monitoring:
  enable: true
  update_interval: 5.0  # seconds
  metrics_retention: 1000  # number of data points
  
  # Health checks
  health_checks:
    enable: true
    interval: 30.0  # seconds
  
  # Alerts
  alerts:
    enable: true
    error_rate_threshold: 0.1  # 10%
    response_time_threshold: 5.0  # seconds
    memory_threshold: 0.9  # 90%

# Workflow Settings
workflows:
  # HunyuanVideo
  hunyuan:
    default_resolution: "720p"
    default_duration: 5
    max_duration: 10
  
  # Wan ATI
  wan_ati:
    default_resolution: "480p"
    max_trajectories: 10
  
  # Qwen Image
  qwen:
    max_reference_images: 5
    default_edit_strength: 0.8
  
  # Flux
  flux:
    default_resolution: "1024x1024"
    default_steps: 50

# Logging Settings
logging:
  level: "INFO"  # DEBUG, INFO, WARNING, ERROR, CRITICAL
  format: "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
  file: "logs/storycore.log"
  max_size_mb: 50
  backup_count: 5
```

#### Step 2: Load Configuration in Python

```python
# src/config_loader.py
import yaml
from pathlib import Path
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from src.security_validation_system import SecurityLevel

@dataclass
class InputValidationConfig:
    max_prompt_length: int = 10000
    max_image_size_mb: float = 50.0
    max_video_size_mb: float = 500.0
    allowed_image_formats: List[str] = field(default_factory=list)
    allowed_video_formats: List[str] = field(default_factory=list)
    dangerous_patterns: List[str] = field(default_factory=list)

@dataclass
class ModelSecurityConfig:
    enable_integrity_checking: bool = True
    checksum_file: str = "models/checksums.json"
    checksum_algorithm: str = "sha256"
    auto_register_new_models: bool = True

@dataclass
class AccessControlConfig:
    enable: bool = True
    default_user_level: str = "authenticated"
    permissions: Dict[str, List[str]] = field(default_factory=dict)
    custom_permissions: Dict[str, List[str]] = field(default_factory=dict)

@dataclass
class AuditLoggingConfig:
    enable: bool = True
    log_file: str = "logs/security_audit.jsonl"
    log_format: str = "jsonl"
    max_log_size_mb: int = 100
    rotate_logs: bool = True
    retention_days: int = 90
    log_events: Dict[str, bool] = field(default_factory=dict)
    log_levels: Dict[str, bool] = field(default_factory=dict)

@dataclass
class PrivacyConfig:
    enable_pii_detection: bool = True
    enable_pii_redaction: bool = False
    pii_replacement: str = "[REDACTED]"
    detect_pii_types: List[str] = field(default_factory=list)
    anonymize_user_data: bool = True
    anonymization_fields: List[str] = field(default_factory=list)

@dataclass
class DownloadsConfig:
    enable_url_validation: bool = True
    allowed_domains: List[str] = field(default_factory=list)
    max_download_size_gb: float = 50.0
    download_timeout: int = 600
    verify_ssl: bool = True

@dataclass
class SanitizationConfig:
    enable_html_sanitization: bool = True
    enable_sql_sanitization: bool = True
    enable_path_sanitization: bool = True

@dataclass
class SecurityConfig:
    input_validation: InputValidationConfig = field(default_factory=InputValidationConfig)
    model_security: ModelSecurityConfig = field(default_factory=ModelSecurityConfig)
    access_control: AccessControlConfig = field(default_factory=AccessControlConfig)
    audit_logging: AuditLoggingConfig = field(default_factory=AuditLoggingConfig)
    privacy: PrivacyConfig = field(default_factory=PrivacyConfig)
    downloads: DownloadsConfig = field(default_factory=DownloadsConfig)
    sanitization: SanitizationConfig = field(default_factory=SanitizationConfig)

@dataclass
class StoryCoreConfig:
    project: Dict[str, Any] = field(default_factory=dict)
    models: Dict[str, Any] = field(default_factory=dict)
    security: SecurityConfig = field(default_factory=SecurityConfig)
    error_handling: Dict[str, Any] = field(default_factory=dict)
    monitoring: Dict[str, Any] = field(default_factory=dict)
    workflows: Dict[str, Any] = field(default_factory=dict)
    logging: Dict[str, Any] = field(default_factory=dict)

def load_config(config_path: Path) -> StoryCoreConfig:
    """Load configuration from YAML file"""
    with open(config_path, 'r') as f:
        config_dict = yaml.safe_load(f)
    
    # Parse security config
    security_dict = config_dict.get('security', {})
    
    security_config = SecurityConfig(
        input_validation=InputValidationConfig(**security_dict.get('input_validation', {})),
        model_security=ModelSecurityConfig(**security_dict.get('model_security', {})),
        access_control=AccessControlConfig(**security_dict.get('access_control', {})),
        audit_logging=AuditLoggingConfig(**security_dict.get('audit_logging', {})),
        privacy=PrivacyConfig(**security_dict.get('privacy', {})),
        downloads=DownloadsConfig(**security_dict.get('downloads', {})),
        sanitization=SanitizationConfig(**security_dict.get('sanitization', {}))
    )
    
    # Create main config
    config = StoryCoreConfig(
        project=config_dict.get('project', {}),
        models=config_dict.get('models', {}),
        security=security_config,
        error_handling=config_dict.get('error_handling', {}),
        monitoring=config_dict.get('monitoring', {}),
        workflows=config_dict.get('workflows', {}),
        logging=config_dict.get('logging', {})
    )
    
    return config
```

#### Step 3: Apply Configuration to Security System

```python
# src/security_configurator.py
from pathlib import Path
from src.security_validation_system import SecurityValidationSystem, SecurityLevel
from src.config_loader import load_config

def configure_security_from_file(config_path: Path) -> SecurityValidationSystem:
    """Configure security system from configuration file"""
    
    # Load configuration
    config = load_config(config_path)
    
    # Initialize security system
    security = SecurityValidationSystem()
    
    # Configure input validation
    input_config = config.security.input_validation
    security.input_validator.max_prompt_length = input_config.max_prompt_length
    security.input_validator.max_image_size_mb = input_config.max_image_size_mb
    security.input_validator.max_video_size_mb = input_config.max_video_size_mb
    
    if input_config.allowed_image_formats:
        security.input_validator.allowed_image_formats = set(input_config.allowed_image_formats)
    if input_config.allowed_video_formats:
        security.input_validator.allowed_video_formats = set(input_config.allowed_video_formats)
    if input_config.dangerous_patterns:
        security.input_validator.dangerous_patterns = input_config.dangerous_patterns
    
    # Configure model security
    model_config = config.security.model_security
    if model_config.checksum_file:
        security.model_integrity_checker.checksum_file = Path(model_config.checksum_file)
        security.model_integrity_checker.known_checksums = security.model_integrity_checker._load_checksums()
    
    # Configure access control
    access_config = config.security.access_control
    if access_config.enable:
        # Set default permissions
        for resource, levels in access_config.permissions.items():
            security_levels = {SecurityLevel[level.upper()] for level in levels}
            security.access_control.permissions[resource] = security_levels
        
        # Set custom permissions
        for resource, levels in access_config.custom_permissions.items():
            security_levels = {SecurityLevel[level.upper()] for level in levels}
            security.access_control.add_custom_permission(resource, security_levels)
    
    # Configure audit logging
    audit_config = config.security.audit_logging
    if audit_config.enable and audit_config.log_file:
        security.audit_logger.log_file = Path(audit_config.log_file)
        security.audit_logger.log_file.parent.mkdir(parents=True, exist_ok=True)
    
    # Configure downloads
    download_config = config.security.downloads
    if download_config.allowed_domains:
        security.secure_downloader.allowed_domains = set(download_config.allowed_domains)
    security.secure_downloader.max_download_size_gb = download_config.max_download_size_gb
    
    # Configure privacy
    privacy_config = config.security.privacy
    if privacy_config.pii_replacement:
        # Note: PrivacyProtector doesn't have a configurable replacement by default
        # This would need to be added to the class if needed
        pass
    
    return security

# Usage example
def main():
    # Load and configure security
    config_path = Path("config/storycore_config.yaml")
    security = configure_security_from_file(config_path)
    
    print("✓ Security system configured from file")
    print(f"  Max prompt length: {security.input_validator.max_prompt_length}")
    print(f"  Max image size: {security.input_validator.max_image_size_mb}MB")
    print(f"  Allowed domains: {security.secure_downloader.allowed_domains}")
    print(f"  Audit log: {security.audit_logger.log_file}")
```

#### Step 4: Environment-Specific Configuration

```python
# config/development.yaml
security:
  input_validation:
    max_prompt_length: 20000  # More lenient for testing
  
  model_security:
    enable_integrity_checking: false  # Faster iteration
  
  access_control:
    default_user_level: "admin"  # Full access for development
  
  audit_logging:
    enable: false  # Reduce noise during development

# config/staging.yaml
security:
  input_validation:
    max_prompt_length: 10000
  
  model_security:
    enable_integrity_checking: true
  
  access_control:
    default_user_level: "authenticated"
  
  audit_logging:
    enable: true
    retention_days: 30  # Shorter retention for staging

# config/production.yaml
security:
  input_validation:
    max_prompt_length: 10000
  
  model_security:
    enable_integrity_checking: true
    auto_register_new_models: false  # Manual registration only
  
  access_control:
    default_user_level: "authenticated"
    enable: true
  
  audit_logging:
    enable: true
    retention_days: 90
    rotate_logs: true
  
  privacy:
    enable_pii_detection: true
    enable_pii_redaction: true  # Auto-redact in production
    anonymize_user_data: true
```

#### Step 5: Load Environment-Specific Configuration

```python
import os
from pathlib import Path

def load_environment_config() -> StoryCoreConfig:
    """Load configuration based on environment"""
    
    # Get environment
    env = os.getenv('STORYCORE_ENV', 'development')
    
    # Load base config
    base_config_path = Path(f"config/storycore_config.yaml")
    config = load_config(base_config_path)
    
    # Load environment-specific overrides
    env_config_path = Path(f"config/{env}.yaml")
    if env_config_path.exists():
        env_config = load_config(env_config_path)
        
        # Merge configurations (env overrides base)
        # This is a simplified merge - you may want a more sophisticated approach
        config.security = env_config.security
    
    print(f"✓ Loaded configuration for environment: {env}")
    return config

# Usage
config = load_environment_config()
security = configure_security_from_file(Path("config/storycore_config.yaml"))
```

## Testing Integration

### Step 1: Add Security Tests to Existing Test Suites

```python
# In tests/test_enhanced_video_engine.py
from src.security_validation_system import SecurityValidationSystem, SecurityLevel

class TestEnhancedVideoEngineWithSecurity(unittest.TestCase):
    
    def setUp(self):
        self.engine = EnhancedVideoEngine(config)
        self.security = self.engine.security
        self.security.access_control.set_user_level('test_user', SecurityLevel.AUTHENTICATED)
    
    def test_video_generation_with_validation(self):
        """Test video generation with security validation"""
        request = {
            'workflow_type': 'advanced_video',
            'prompt': 'A beautiful sunset',
            'resolution': '720p'
        }
        
        # Should succeed with valid request
        result = asyncio.run(self.engine.generate_video(request, 'test_user'))
        self.assertIsNotNone(result)
    
    def test_video_generation_blocks_dangerous_input(self):
        """Test that dangerous input is blocked"""
        request = {
            'workflow_type': 'advanced_video',
            'prompt': '<script>alert("xss")</script>',
            'resolution': '720p'
        }
        
        # Should raise ValidationError
        with self.assertRaises(ValidationError):
            asyncio.run(self.engine.generate_video(request, 'test_user'))
    
    def test_video_generation_enforces_access_control(self):
        """Test access control enforcement"""
        request = {
            'workflow_type': 'system_configuration',
            'prompt': 'Configure system'
        }
        
        # Should raise PermissionError for non-admin user
        with self.assertRaises(PermissionError):
            asyncio.run(self.engine.generate_video(request, 'test_user'))
```

### Step 2: Integration Test Example

```python
# tests/test_security_integration.py
import unittest
from pathlib import Path
import tempfile

from src.enhanced_video_engine import EnhancedVideoEngine
from src.enhanced_image_engine import EnhancedImageEngine
from src.advanced_model_manager import AdvancedModelManager
from src.security_validation_system import SecurityLevel

class TestSecurityIntegration(unittest.TestCase):
    """Test security integration across all components"""
    
    def setUp(self):
        self.video_engine = EnhancedVideoEngine(config)
        self.image_engine = EnhancedImageEngine(config)
        self.model_manager = AdvancedModelManager(config)
        
        # Set up test user
        for engine in [self.video_engine, self.image_engine, self.model_manager]:
            engine.security.access_control.set_user_level('test_user', SecurityLevel.AUTHENTICATED)
    
    def test_end_to_end_video_workflow_with_security(self):
        """Test complete video workflow with security"""
        # Create test image
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as f:
            f.write(b'fake image')
            image_path = Path(f.name)
        
        try:
            # Video generation request
            request = {
                'workflow_type': 'advanced_video',
                'prompt': 'A serene landscape',
                'image_path': str(image_path),
                'trajectory': [[{"x": 100, "y": 200}]]
            }
            
            # Should validate and execute
            result = asyncio.run(self.video_engine.generate_video(request, 'test_user'))
            self.assertIsNotNone(result)
            
            # Check audit log
            logs = self.video_engine.security.audit_logger.get_audit_logs(user_id='test_user')
            self.assertGreater(len(logs), 0)
            
        finally:
            image_path.unlink()
    
    def test_model_download_with_security(self):
        """Test model download with security validation"""
        url = "https://huggingface.co/test/model.safetensors"
        
        # Should validate URL
        result = self.model_manager.security.validate_download_request(url, 'test_user')
        self.assertTrue(result.is_valid)
        
        # Check audit log
        logs = self.model_manager.security.audit_logger.get_audit_logs(
            user_id='test_user',
            action='model_download'
        )
        self.assertGreater(len(logs), 0)
```

## Best Practices

### 1. Always Initialize Security System

```python
# ✓ Good: Initialize in constructor
class MyEngine:
    def __init__(self, config):
        self.security = SecurityValidationSystem()

# ✗ Bad: Create new instance each time
class MyEngine:
    def process(self):
        security = SecurityValidationSystem()  # Inefficient!
```

### 2. Validate Early, Fail Fast

```python
# ✓ Good: Validate at entry point
async def generate_video(self, request, user_id):
    is_valid, results = self.security.validate_workflow_request(request, user_id)
    if not is_valid:
        raise ValidationError("Invalid request")
    # ... proceed with generation

# ✗ Bad: Validate late in process
async def generate_video(self, request, user_id):
    # ... lots of processing ...
    is_valid, results = self.security.validate_workflow_request(request, user_id)
```

### 3. Log All Security Events

```python
# ✓ Good: Log both success and failure
try:
    result = await self.process(request)
    self.security.audit_logger.log_workflow_execution(user_id, workflow, True)
except Exception as e:
    self.security.audit_logger.log_workflow_execution(user_id, workflow, False, {'error': str(e)})
    raise

# ✗ Bad: Only log success
result = await self.process(request)
self.security.audit_logger.log_workflow_execution(user_id, workflow, True)
```

### 4. Use Appropriate Error Types

```python
# ✓ Good: Specific error types
if not is_valid:
    raise ValidationError(f"Validation failed: {message}")

if not has_permission:
    raise PermissionError(f"Access denied: {message}")

# ✗ Bad: Generic exceptions
if not is_valid:
    raise Exception("Something went wrong")
```

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Security system not initialized

**Symptom:**
```
AttributeError: 'NoneType' object has no attribute 'validate_workflow_request'
```

**Cause:** Security system not initialized in the engine constructor.

**Solution:**
```python
class MyEngine:
    def __init__(self, config):
        # Add this line
        self.security = SecurityValidationSystem()
```

**Verification:**
```python
# Test that security is initialized
assert hasattr(engine, 'security'), "Security system not initialized"
assert engine.security is not None, "Security system is None"
```

---

#### Issue 2: All requests being denied

**Symptom:**
```
PermissionError: Access denied to advanced_video
```

**Cause:** User security level not set or insufficient permissions.

**Solution 1 - Set user level:**
```python
# Set user to authenticated level
engine.security.access_control.set_user_level(
    user_id="user123",
    level=SecurityLevel.AUTHENTICATED
)
```

**Solution 2 - Add custom permission:**
```python
# Add permission for specific workflow
engine.security.access_control.add_custom_permission(
    'my_workflow',
    {SecurityLevel.PUBLIC, SecurityLevel.AUTHENTICATED}
)
```

**Verification:**
```python
# Check user level
result = engine.security.access_control.check_permission(
    user_id="user123",
    resource="advanced_video"
)
print(f"Access granted: {result.is_valid}")
print(f"User level: {result.details.get('user_level')}")
print(f"Required levels: {result.details.get('required_levels')}")
```

---

#### Issue 3: Model integrity checks failing

**Symptom:**
```
ModelIntegrityError: Model integrity check failed: flux-dev.safetensors
Expected: abc123..., Actual: def456...
```

**Cause:** Model file has been modified or corrupted, or checksum is outdated.

**Solution 1 - Re-register checksum (if model is known good):**
```python
from pathlib import Path

# Re-register the model checksum
model_path = Path("models/flux-dev.safetensors")
engine.security.model_integrity_checker.register_model_checksum(model_path)
print("✓ Model checksum re-registered")
```

**Solution 2 - Verify model source:**
```python
# Download model again from trusted source
url = "https://huggingface.co/black-forest-labs/FLUX.1-dev/resolve/main/flux1-dev.safetensors"

# Validate URL first
result = engine.security.validate_download_request(url, user_id="admin")
if result.is_valid:
    # Re-download model
    await model_manager.download_model("flux-dev", url, user_id="admin")
```

**Solution 3 - Disable integrity checking (not recommended for production):**
```python
# In config
security:
  enable_integrity_checking: false
```

---

#### Issue 4: Trajectory validation failing

**Symptom:**
```
ValidationError: Invalid trajectory: Point 5 in trajectory 0 missing 'x' or 'y' coordinate
```

**Cause:** Trajectory data structure is incorrect.

**Solution - Fix trajectory format:**
```python
# ✗ Wrong format
trajectory = [
    {"x": 100, "y": 200},  # Missing list wrapper
    {"x": 150, "y": 250}
]

# ✓ Correct format
trajectory = [
    [  # Each trajectory is a list of points
        {"x": 100, "y": 200},
        {"x": 150, "y": 250}
    ]
]

# Validate before use
result = engine.security.input_validator.validate_trajectory_json(trajectory)
if result.is_valid:
    print(f"✓ Trajectory valid: {result.details['num_trajectories']} trajectories")
else:
    print(f"✗ Trajectory invalid: {result.message}")
```

---

#### Issue 5: Prompt validation failing with dangerous content

**Symptom:**
```
ValidationError: Prompt contains potentially dangerous content
```

**Cause:** Prompt contains patterns that could be used for injection attacks.

**Solution - Sanitize or rewrite prompt:**
```python
# ✗ Dangerous prompt
prompt = "<script>alert('xss')</script>A beautiful sunset"

# ✓ Solution 1: Sanitize
safe_prompt = engine.security.data_sanitizer.sanitize_html(prompt)
# Result: "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;A beautiful sunset"

# ✓ Solution 2: Rewrite without dangerous content
prompt = "A beautiful sunset"

# Validate
result = engine.security.input_validator.validate_text_prompt(prompt)
if result.is_valid:
    print("✓ Prompt is safe")
```

---

#### Issue 6: Image file validation failing

**Symptom:**
```
ValidationError: Image file too large: 75.50MB (max: 50MB)
```

**Cause:** Image file exceeds size limit.

**Solution 1 - Resize image:**
```python
from PIL import Image

# Resize image to reduce file size
img = Image.open("large_image.jpg")
img.thumbnail((2048, 2048))  # Resize maintaining aspect ratio
img.save("resized_image.jpg", quality=85)

# Validate resized image
result = engine.security.input_validator.validate_image_input("resized_image.jpg")
print(f"✓ Image size: {result.details['size_mb']:.2f}MB")
```

**Solution 2 - Increase limit in configuration:**
```python
# In config
security:
  max_image_size_mb: 100.0  # Increase to 100MB
```

**Solution 3 - Adjust validator limits:**
```python
# Adjust limits at runtime
engine.security.input_validator.max_image_size_mb = 100.0
```

---

#### Issue 7: Audit logs not being written

**Symptom:** No entries in `logs/security_audit.jsonl`

**Cause:** Log directory doesn't exist or insufficient permissions.

**Solution 1 - Create log directory:**
```python
from pathlib import Path

# Create logs directory
log_dir = Path("logs")
log_dir.mkdir(exist_ok=True)

# Verify permissions
log_file = log_dir / "security_audit.jsonl"
print(f"Log file: {log_file}")
print(f"Directory exists: {log_dir.exists()}")
print(f"Directory writable: {os.access(log_dir, os.W_OK)}")
```

**Solution 2 - Check audit logger initialization:**
```python
# Verify audit logger is initialized
assert engine.security.audit_logger is not None
assert engine.security.audit_logger.log_file.parent.exists()

# Test logging
engine.security.audit_logger.log_workflow_execution(
    user_id="test",
    workflow_type="test",
    success=True
)

# Verify log was written
logs = engine.security.audit_logger.get_audit_logs(user_id="test")
print(f"✓ Found {len(logs)} log entries")
```

---

#### Issue 8: Download URL validation failing for trusted domain

**Symptom:**
```
ValidationError: Untrusted domain: cdn.example.com
```

**Cause:** Domain is not in the whitelist.

**Solution 1 - Add domain to whitelist:**
```python
# Add custom domain
engine.security.secure_downloader.allowed_domains.add('cdn.example.com')

# Validate URL
result = engine.security.validate_download_request(
    "https://cdn.example.com/model.safetensors",
    user_id="user123"
)
print(f"✓ URL validated: {result.is_valid}")
```

**Solution 2 - Configure in settings:**
```python
# In config
security:
  allowed_domains:
    - huggingface.co
    - civitai.com
    - github.com
    - githubusercontent.com
    - cdn.example.com  # Add custom domain
```

---

#### Issue 9: PII detected in prompts

**Symptom:**
```
Warning: PII detected in prompt: ['email', 'phone']
```

**Cause:** Prompt contains personally identifiable information.

**Solution - Redact PII before processing:**
```python
# Detect PII
prompt = "Contact me at john@example.com or 555-123-4567"
pii = engine.security.privacy_protector.detect_pii(prompt)

if pii:
    print(f"⚠ PII detected: {list(pii.keys())}")
    
    # Redact PII
    safe_prompt = engine.security.privacy_protector.redact_pii(prompt)
    print(f"✓ Redacted prompt: {safe_prompt}")
    # Result: "Contact me at [REDACTED] or [REDACTED]"
    
    # Use redacted prompt
    result = await engine.generate_video(safe_prompt, user_id="user123")
```

---

#### Issue 10: Security report shows high failed access attempts

**Symptom:** Security report shows many failed access attempts.

**Investigation:**
```python
from datetime import datetime, timedelta

# Get security report for last 24 hours
report = engine.security.get_security_report(
    start_time=datetime.now() - timedelta(days=1)
)

print(f"Total events: {report['total_events']}")
print(f"Failed access attempts: {report['failed_access_attempts']}")
print(f"Unique users: {report['unique_users']}")

# Get detailed logs
logs = engine.security.audit_logger.get_audit_logs(
    start_time=datetime.now() - timedelta(days=1),
    action='access_attempt'
)

# Analyze failed attempts
failed_attempts = [log for log in logs if log['result'] == 'denied']
for attempt in failed_attempts[-10:]:  # Last 10 failures
    print(f"User: {attempt['user_id']}")
    print(f"Resource: {attempt['resource']}")
    print(f"Time: {attempt['timestamp']}")
    print(f"IP: {attempt.get('ip_address', 'N/A')}")
    print("---")
```

**Solutions:**
1. **Legitimate users:** Increase their security level
2. **Unauthorized access:** Investigate IP addresses and block if necessary
3. **Configuration issue:** Review permission settings

---

### Debugging Tips

#### Enable Debug Logging

```python
import logging

# Enable debug logging for security system
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger('src.security_validation_system')
logger.setLevel(logging.DEBUG)

# Now all security operations will be logged
```

#### Test Security Components Individually

```python
# Test input validator
validator = engine.security.input_validator
result = validator.validate_text_prompt("Test prompt")
print(f"Prompt validation: {result.is_valid} - {result.message}")

# Test access control
access = engine.security.access_control
access.set_user_level("test_user", SecurityLevel.AUTHENTICATED)
result = access.check_permission("test_user", "advanced_video")
print(f"Access check: {result.is_valid} - {result.message}")

# Test model integrity
checker = engine.security.model_integrity_checker
result = checker.verify_model_integrity(Path("models/test.safetensors"))
print(f"Integrity check: {result.is_valid} - {result.message}")
```

#### Verify Configuration

```python
# Print current security configuration
print("Security Configuration:")
print(f"  Max prompt length: {engine.security.input_validator.max_prompt_length}")
print(f"  Max image size: {engine.security.input_validator.max_image_size_mb}MB")
print(f"  Max video size: {engine.security.input_validator.max_video_size_mb}MB")
print(f"  Allowed domains: {engine.security.secure_downloader.allowed_domains}")
print(f"  Audit log file: {engine.security.audit_logger.log_file}")
```

---

### Performance Troubleshooting

#### Issue: Slow validation

**Symptom:** Request validation takes too long.

**Investigation:**
```python
import time

# Measure validation time
start = time.time()
is_valid, results = engine.security.validate_workflow_request(request, user_id)
elapsed = time.time() - start

print(f"Validation time: {elapsed*1000:.2f}ms")

# Check individual components
start = time.time()
prompt_result = engine.security.input_validator.validate_text_prompt(prompt)
print(f"Prompt validation: {(time.time() - start)*1000:.2f}ms")

start = time.time()
image_result = engine.security.input_validator.validate_image_input(image_path)
print(f"Image validation: {(time.time() - start)*1000:.2f}ms")
```

**Solutions:**
1. **Large files:** Validation time increases with file size (expected)
2. **Many dangerous patterns:** Reduce pattern list if not needed
3. **Disk I/O:** Use SSD for faster file access

---

### Getting Help

If you encounter issues not covered here:

1. **Check logs:** Review `logs/security_audit.jsonl` for detailed information
2. **Enable debug logging:** Set logging level to DEBUG
3. **Test components:** Test each security component individually
4. **Review configuration:** Verify security settings in config file
5. **Check documentation:** See [Security API Reference](api/security-validation-api.md)
6. **Report issues:** Create an issue with:
   - Error message
   - Code snippet
   - Configuration
   - Log entries

## Summary

The Security and Validation System integrates seamlessly with existing StoryCore-Engine components:

1. **Video Engine:** Request validation, trajectory validation, audit logging
2. **Image Engine:** Prompt sanitization, reference image validation, audit logging
3. **Model Manager:** Integrity checking, secure downloads, access control
4. **CLI:** Security options, validation commands, security reports
5. **Configuration:** Security settings, flexible configuration
6. **Testing:** Security test integration, end-to-end validation

Follow the integration patterns in this guide to ensure comprehensive security across all components.
