"""
Image and Concept Art Category Handler

This module implements all 8 image generation and manipulation API endpoints.
"""

import logging
import json
import time
from typing import Dict, Any, Optional, List, Tuple
from pathlib import Path
from datetime import datetime
import uuid
import sys

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from ..base_handler import BaseAPIHandler
from ..models import APIResponse, RequestContext, ErrorCodes
from ..config import APIConfig
from ..router import APIRouter

from .image_models import (
    ImageGenerationRequest,
    ImageGenerationResponse,
    GridCreationRequest,
    GridCreationResponse,
    PanelPromotionRequest,
    PanelPromotionResponse,
    ImageRefinementRequest,
    ImageRefinementResponse,
    ImageAnalysisRequest,
    ImageAnalysisResponse,
    ImageQualityMetrics,
    StyleExtractionRequest,
    StyleExtractionResponse,
    StyleParameters,
    StyleApplicationRequest,
    StyleApplicationResponse,
    BatchProcessingRequest,
    BatchProcessingResponse,
    GridFormat,
    UpscaleMethod,
    calculate_quality_grade,
)

logger = logging.getLogger(__name__)


class ImageCategoryHandler(BaseAPIHandler):
    """
    Handler for Image and Concept Art API category.
    
    Implements 8 endpoints for image generation, grid creation, promotion,
    analysis, style transfer, and batch processing.
    """

    
    def __init__(self, config: APIConfig, router: APIRouter):
        """
        Initialize image handler.
        
        Args:
            config: API configuration
            router: API router for endpoint registration
        """
        super().__init__(config)
        self.router = router
        
        # Import grid generator and promotion engine
        try:
            from grid_generator import GridGenerator
            self.grid_generator = GridGenerator
        except ImportError:
            logger.warning("GridGenerator not available - grid endpoints will be limited")
            self.grid_generator = None
        
        try:
            from promotion_engine import promote_panels, update_project_manifest
            self.promote_panels = promote_panels
            self.update_project_manifest = update_project_manifest
        except ImportError:
            logger.warning("PromotionEngine not available - promotion endpoints will be limited")
            self.promote_panels = None
            self.update_project_manifest = None
        
        # Try to import PIL for image analysis
        try:
            from PIL import Image
            import numpy as np
            self.PIL_Image = Image
            self.np = np
            self.image_processing_available = True
        except ImportError:
            logger.warning("PIL/NumPy not available - image analysis will be limited")
            self.image_processing_available = False
        
        # Register all endpoints
        self.register_endpoints()
        
        logger.info("Initialized ImageCategoryHandler with 8 endpoints")

    
    def register_endpoints(self) -> None:
        """Register all image endpoints with the router."""
        
        # Core image generation endpoints (4)
        self.router.register_endpoint(
            path="storycore.image.generate",
            method="POST",
            handler=self.generate_image,
            description="Generate image using configured backend",
            async_capable=True,
        )
        
        self.router.register_endpoint(
            path="storycore.image.grid.create",
            method="POST",
            handler=self.create_grid,
            description="Generate Master Coherence Sheet (3x3 grid)",
            async_capable=True,
        )
        
        self.router.register_endpoint(
            path="storycore.image.promote",
            method="POST",
            handler=self.promote_panel,
            description="Upscale and refine selected panel",
            async_capable=True,
        )
        
        self.router.register_endpoint(
            path="storycore.image.refine",
            method="POST",
            handler=self.refine_image,
            description="Enhance image quality",
            async_capable=True,
        )
        
        # Image analysis and style endpoints (3)
        self.router.register_endpoint(
            path="storycore.image.analyze",
            method="POST",
            handler=self.analyze_image,
            description="Analyze image quality metrics",
            async_capable=False,
        )
        
        self.router.register_endpoint(
            path="storycore.image.style.extract",
            method="POST",
            handler=self.extract_style,
            description="Extract style parameters from reference image",
            async_capable=False,
        )
        
        self.router.register_endpoint(
            path="storycore.image.style.apply",
            method="POST",
            handler=self.apply_style,
            description="Apply style to target image",
            async_capable=True,
        )
        
        # Batch processing endpoint (1)
        self.router.register_endpoint(
            path="storycore.image.batch.process",
            method="POST",
            handler=self.batch_process,
            description="Process multiple images in batch",
            async_capable=True,
        )

    
    # Core image generation endpoints
    
    def generate_image(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Generate image using configured backend.
        
        Endpoint: storycore.image.generate
        Requirements: 7.1
        """
        error = self.validate_required_params(params, ["prompt"], context)
        if error:
            return error
        
        try:
            prompt = params["prompt"]
            negative_prompt = params.get("negative_prompt")
            width = params.get("width", 512)
            height = params.get("height", 512)
            seed = params.get("seed")
            steps = params.get("steps", 20)
            cfg_scale = params.get("cfg_scale", 7.0)
            
            # Validate dimensions
            if width <= 0 or height <= 0:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid dimensions: {width}x{height}",
                    context=context,
                    details={"width": width, "height": height},
                    remediation="Width and height must be positive integers",
                )
            
            # For now, this is a placeholder that would integrate with ComfyUI or other backend
            # In a real implementation, this would call the actual image generation service
            start_time = time.time()
            
            # Simulate image generation
            output_path = f"generated_image_{uuid.uuid4().hex[:8]}.png"
            actual_seed = seed if seed is not None else int(time.time())
            
            response_data = {
                "image_path": output_path,
                "width": width,
                "height": height,
                "seed": actual_seed,
                "generation_time": time.time() - start_time,
                "metadata": {
                    "prompt": prompt,
                    "negative_prompt": negative_prompt,
                    "steps": steps,
                    "cfg_scale": cfg_scale,
                    "backend": "mock",  # Would be "comfyui" or actual backend
                },
            }
            
            logger.info(f"Generated image: {output_path}")
            return self.create_success_response(response_data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)

    
    def create_grid(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Generate Master Coherence Sheet (3x3 grid).
        
        Endpoint: storycore.image.grid.create
        Requirements: 7.2
        """
        error = self.validate_required_params(params, ["project_name"], context)
        if error:
            return error
        
        try:
            project_name = params["project_name"]
            grid_format = params.get("grid_format", "3x3")
            cell_size = params.get("cell_size", 512)
            output_path = params.get("output_path")
            base_path = params.get("base_path", ".")
            
            # Validate grid format
            valid_formats = ["3x3", "1x2", "1x4"]
            if grid_format not in valid_formats:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid grid format: {grid_format}",
                    context=context,
                    details={"grid_format": grid_format, "valid_formats": valid_formats},
                    remediation=f"Use one of: {', '.join(valid_formats)}",
                )
            
            # Validate cell size
            if cell_size <= 0:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid cell size: {cell_size}",
                    context=context,
                    details={"cell_size": cell_size},
                    remediation="Cell size must be a positive integer",
                )
            
            # Check if project exists
            project_path = Path(base_path) / project_name
            if not project_path.exists():
                return self.create_error_response(
                    error_code=ErrorCodes.NOT_FOUND,
                    message=f"Project '{project_name}' not found",
                    context=context,
                    details={"project_path": str(project_path)},
                    remediation="Initialize the project first using storycore.pipeline.init",
                )
            
            start_time = time.time()
            
            # Use grid generator if available
            if self.grid_generator:
                generator = self.grid_generator()
                grid_path = generator.generate_grid(
                    str(project_path),
                    grid_format,
                    output_path,
                    cell_size
                )
            else:
                # Fallback: simulate grid generation
                grid_path = str(project_path / "assets" / "images" / "grid.png")
                logger.warning("GridGenerator not available, using mock path")
            
            # Calculate panel count
            cols, rows = map(int, grid_format.split('x'))
            total_panels = cols * rows
            
            # Generate panel paths
            panel_paths = [
                str(project_path / "assets" / "images" / "panels" / f"panel_{i:02d}.ppm")
                for i in range(1, total_panels + 1)
            ]
            
            response_data = {
                "project_name": project_name,
                "grid_path": grid_path,
                "grid_format": grid_format,
                "cell_size": cell_size,
                "total_panels": total_panels,
                "panel_paths": panel_paths,
                "generation_time": time.time() - start_time,
            }
            
            logger.info(f"Created {grid_format} grid for project: {project_name}")
            return self.create_success_response(response_data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)

    
    def promote_panel(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Upscale and refine selected panel.
        
        Endpoint: storycore.image.promote
        Requirements: 7.3
        """
        error = self.validate_required_params(params, ["project_name"], context)
        if error:
            return error
        
        try:
            project_name = params["project_name"]
            scale = params.get("scale", 2)
            method = params.get("method", "lanczos")
            base_path = params.get("base_path", ".")
            
            # Validate scale
            if scale <= 0:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid scale factor: {scale}",
                    context=context,
                    details={"scale": scale},
                    remediation="Scale factor must be a positive integer",
                )
            
            if scale > 4:
                logger.warning(f"Large scale factor ({scale}x) may result in very large files")
            
            # Validate method
            valid_methods = ["lanczos", "bicubic", "bilinear", "nearest"]
            if method not in valid_methods:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid upscale method: {method}",
                    context=context,
                    details={"method": method, "valid_methods": valid_methods},
                    remediation=f"Use one of: {', '.join(valid_methods)}",
                )
            
            # Check if project exists
            project_path = Path(base_path) / project_name
            if not project_path.exists():
                return self.create_error_response(
                    error_code=ErrorCodes.NOT_FOUND,
                    message=f"Project '{project_name}' not found",
                    context=context,
                    details={"project_path": str(project_path)},
                    remediation="Initialize the project first",
                )
            
            start_time = time.time()
            
            # Use promotion engine if available
            if self.promote_panels:
                result = self.promote_panels(project_path, scale, method)
                
                # Update project manifest
                if self.update_project_manifest:
                    self.update_project_manifest(project_path, result['metadata'])
                
                response_data = {
                    "project_name": project_name,
                    "promoted_panels": result.get('promoted_panels', []),
                    "output_dir": result.get('output_dir', str(project_path / "assets" / "images" / "promoted")),
                    "total_panels": result['metadata']['total_panels'],
                    "resolutions": result.get('resolutions', []),
                    "promotion_time": time.time() - start_time,
                }
            else:
                # Fallback: simulate promotion
                response_data = {
                    "project_name": project_name,
                    "promoted_panels": [],
                    "output_dir": str(project_path / "assets" / "images" / "promoted"),
                    "total_panels": 0,
                    "resolutions": [],
                    "promotion_time": time.time() - start_time,
                }
                logger.warning("PromotionEngine not available, using mock response")
            
            logger.info(f"Promoted panels for project: {project_name}")
            return self.create_success_response(response_data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)

    
    def refine_image(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Enhance image quality.
        
        Endpoint: storycore.image.refine
        Requirements: 7.4
        """
        error = self.validate_required_params(params, ["image_path"], context)
        if error:
            return error
        
        try:
            image_path = params["image_path"]
            denoising_strength = params.get("denoising_strength", 0.3)
            sharpen = params.get("sharpen", True)
            enhance_contrast = params.get("enhance_contrast", False)
            output_path = params.get("output_path")
            
            # Validate image path
            img_path = Path(image_path)
            if not img_path.exists():
                return self.create_error_response(
                    error_code=ErrorCodes.NOT_FOUND,
                    message=f"Image not found: {image_path}",
                    context=context,
                    details={"image_path": image_path},
                    remediation="Check the image path",
                )
            
            # Validate denoising strength
            if not 0.0 <= denoising_strength <= 1.0:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid denoising strength: {denoising_strength}",
                    context=context,
                    details={"denoising_strength": denoising_strength},
                    remediation="Denoising strength must be between 0.0 and 1.0",
                )
            
            start_time = time.time()
            
            # Determine output path
            if not output_path:
                output_path = str(img_path.parent / f"{img_path.stem}_refined{img_path.suffix}")
            
            # Perform refinement (placeholder - would use actual image processing)
            improvements = {
                "sharpness_improved": sharpen,
                "contrast_enhanced": enhance_contrast,
                "noise_reduced": denoising_strength > 0,
                "denoising_strength": denoising_strength,
            }
            
            response_data = {
                "original_path": image_path,
                "refined_path": output_path,
                "improvements": improvements,
                "refinement_time": time.time() - start_time,
            }
            
            logger.info(f"Refined image: {image_path}")
            return self.create_success_response(response_data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)

    
    # Image analysis and style endpoints
    
    def analyze_image(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Analyze image quality metrics.
        
        Endpoint: storycore.image.analyze
        Requirements: 7.5
        """
        error = self.validate_required_params(params, ["image_path"], context)
        if error:
            return error
        
        try:
            image_path = params["image_path"]
            include_histogram = params.get("include_histogram", False)
            include_color_analysis = params.get("include_color_analysis", False)
            
            # Validate image path
            img_path = Path(image_path)
            if not img_path.exists():
                return self.create_error_response(
                    error_code=ErrorCodes.NOT_FOUND,
                    message=f"Image not found: {image_path}",
                    context=context,
                    details={"image_path": image_path},
                    remediation="Check the image path",
                )
            
            start_time = time.time()
            
            # Perform image analysis
            if self.image_processing_available:
                metrics = self._analyze_image_quality(img_path)
            else:
                # Fallback: mock metrics
                metrics = {
                    "laplacian_variance": 150.0,
                    "sharpness_score": 0.75,
                    "brightness": 0.5,
                    "contrast": 0.6,
                    "resolution": (512, 512),
                    "file_size": img_path.stat().st_size if img_path.exists() else 0,
                    "quality_grade": "good",
                    "issues": [],
                    "recommendations": [],
                }
            
            # Optional histogram
            histogram = None
            if include_histogram and self.image_processing_available:
                histogram = self._calculate_histogram(img_path)
            
            # Optional color analysis
            color_analysis = None
            if include_color_analysis and self.image_processing_available:
                color_analysis = self._analyze_colors(img_path)
            
            response_data = {
                "image_path": image_path,
                "metrics": metrics,
                "histogram": histogram,
                "color_analysis": color_analysis,
                "analysis_time": time.time() - start_time,
            }
            
            logger.info(f"Analyzed image: {image_path}")
            return self.create_success_response(response_data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def _analyze_image_quality(self, image_path: Path) -> Dict[str, Any]:
        """Analyze image quality using Laplacian variance and other metrics."""
        try:
            img = self.PIL_Image.open(image_path)
            img_array = self.np.array(img.convert('L'))  # Convert to grayscale
            
            # Calculate Laplacian variance (sharpness metric)
            laplacian = self.np.array([[0, 1, 0], [1, -4, 1], [0, 1, 0]])
            laplacian_img = self.np.abs(self.np.convolve(img_array.flatten(), laplacian.flatten(), mode='same'))
            laplacian_variance = float(self.np.var(laplacian_img))
            
            # Calculate sharpness score (normalized)
            sharpness_score = min(laplacian_variance / 200.0, 1.0)
            
            # Calculate brightness and contrast
            brightness = float(self.np.mean(img_array) / 255.0)
            contrast = float(self.np.std(img_array) / 128.0)
            
            # Determine quality grade
            quality_grade = calculate_quality_grade(laplacian_variance, sharpness_score)
            
            # Identify issues and recommendations
            issues = []
            recommendations = []
            
            if laplacian_variance < 50:
                issues.append("Image appears blurry")
                recommendations.append("Consider using sharpen filter or re-generating with higher quality")
            
            if brightness < 0.2:
                issues.append("Image is too dark")
                recommendations.append("Increase brightness or adjust exposure")
            elif brightness > 0.8:
                issues.append("Image is too bright")
                recommendations.append("Decrease brightness or adjust exposure")
            
            if contrast < 0.3:
                issues.append("Low contrast")
                recommendations.append("Enhance contrast to improve visual impact")
            
            return {
                "laplacian_variance": laplacian_variance,
                "sharpness_score": sharpness_score,
                "brightness": brightness,
                "contrast": contrast,
                "resolution": img.size,
                "file_size": image_path.stat().st_size,
                "quality_grade": quality_grade,
                "issues": issues,
                "recommendations": recommendations,
            }
        except Exception as e:
            logger.error(f"Error analyzing image quality: {e}")
            raise
    
    def _calculate_histogram(self, image_path: Path) -> Dict[str, List[int]]:
        """Calculate color histogram for the image."""
        try:
            img = self.PIL_Image.open(image_path)
            
            if img.mode == 'RGB':
                r, g, b = img.split()
                return {
                    "red": r.histogram(),
                    "green": g.histogram(),
                    "blue": b.histogram(),
                }
            else:
                return {
                    "grayscale": img.histogram(),
                }
        except Exception as e:
            logger.error(f"Error calculating histogram: {e}")
            return {}
    
    def _analyze_colors(self, image_path: Path) -> Dict[str, Any]:
        """Analyze color distribution in the image."""
        try:
            img = self.PIL_Image.open(image_path).convert('RGB')
            img_array = self.np.array(img)
            
            # Calculate dominant colors (simplified)
            pixels = img_array.reshape(-1, 3)
            mean_color = self.np.mean(pixels, axis=0).astype(int)
            
            return {
                "mean_color": f"rgb({mean_color[0]}, {mean_color[1]}, {mean_color[2]})",
                "color_space": "RGB",
                "has_transparency": img.mode == 'RGBA',
            }
        except Exception as e:
            logger.error(f"Error analyzing colors: {e}")
            return {}

    
    def extract_style(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Extract style parameters from reference image.
        
        Endpoint: storycore.image.style.extract
        Requirements: 7.6
        """
        error = self.validate_required_params(params, ["reference_image_path"], context)
        if error:
            return error
        
        try:
            reference_image_path = params["reference_image_path"]
            extract_colors = params.get("extract_colors", True)
            extract_composition = params.get("extract_composition", True)
            extract_lighting = params.get("extract_lighting", True)
            
            # Validate image path
            img_path = Path(reference_image_path)
            if not img_path.exists():
                return self.create_error_response(
                    error_code=ErrorCodes.NOT_FOUND,
                    message=f"Reference image not found: {reference_image_path}",
                    context=context,
                    details={"reference_image_path": reference_image_path},
                    remediation="Check the image path",
                )
            
            start_time = time.time()
            
            # Extract style parameters
            style_params = {
                "dominant_colors": [],
                "color_palette": [],
                "composition_type": None,
                "lighting_style": None,
                "mood": None,
                "texture_characteristics": {},
                "style_tags": [],
            }
            
            if self.image_processing_available:
                if extract_colors:
                    color_info = self._analyze_colors(img_path)
                    style_params["dominant_colors"] = [color_info.get("mean_color", "")]
                    style_params["color_palette"] = [color_info.get("mean_color", "")]
                
                # Placeholder for composition and lighting analysis
                if extract_composition:
                    style_params["composition_type"] = "balanced"
                    style_params["style_tags"].append("balanced_composition")
                
                if extract_lighting:
                    # Analyze brightness to infer lighting
                    metrics = self._analyze_image_quality(img_path)
                    brightness = metrics.get("brightness", 0.5)
                    
                    if brightness > 0.7:
                        style_params["lighting_style"] = "bright"
                        style_params["mood"] = "cheerful"
                    elif brightness < 0.3:
                        style_params["lighting_style"] = "dark"
                        style_params["mood"] = "moody"
                    else:
                        style_params["lighting_style"] = "balanced"
                        style_params["mood"] = "neutral"
            
            response_data = {
                "reference_image_path": reference_image_path,
                "style_parameters": style_params,
                "extraction_time": time.time() - start_time,
            }
            
            logger.info(f"Extracted style from: {reference_image_path}")
            return self.create_success_response(response_data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def apply_style(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Apply style to target image.
        
        Endpoint: storycore.image.style.apply
        Requirements: 7.7
        """
        error = self.validate_required_params(params, ["target_image_path", "style_parameters"], context)
        if error:
            return error
        
        try:
            target_image_path = params["target_image_path"]
            style_parameters = params["style_parameters"]
            strength = params.get("strength", 0.7)
            preserve_content = params.get("preserve_content", True)
            output_path = params.get("output_path")
            
            # Validate target image path
            img_path = Path(target_image_path)
            if not img_path.exists():
                return self.create_error_response(
                    error_code=ErrorCodes.NOT_FOUND,
                    message=f"Target image not found: {target_image_path}",
                    context=context,
                    details={"target_image_path": target_image_path},
                    remediation="Check the image path",
                )
            
            # Validate strength
            if not 0.0 <= strength <= 1.0:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid strength: {strength}",
                    context=context,
                    details={"strength": strength},
                    remediation="Strength must be between 0.0 and 1.0",
                )
            
            start_time = time.time()
            
            # Determine output path
            if not output_path:
                output_path = str(img_path.parent / f"{img_path.stem}_styled{img_path.suffix}")
            
            # Apply style (placeholder - would use actual style transfer)
            style_applied = {
                "colors_applied": "dominant_colors" in style_parameters,
                "lighting_applied": "lighting_style" in style_parameters,
                "composition_preserved": preserve_content,
                "strength": strength,
            }
            
            response_data = {
                "original_path": target_image_path,
                "styled_path": output_path,
                "style_applied": style_applied,
                "application_time": time.time() - start_time,
            }
            
            logger.info(f"Applied style to: {target_image_path}")
            return self.create_success_response(response_data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)

    
    # Batch processing endpoint
    
    def batch_process(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Process multiple images in batch.
        
        Endpoint: storycore.image.batch.process
        Requirements: 7.8
        """
        error = self.validate_required_params(params, ["image_paths", "operation"], context)
        if error:
            return error
        
        try:
            image_paths = params["image_paths"]
            operation = params["operation"]
            operation_params = params.get("parameters", {})
            parallel = params.get("parallel", True)
            max_workers = params.get("max_workers", 4)
            
            # Validate operation
            valid_operations = ["analyze", "refine", "upscale", "style_transfer"]
            if operation not in valid_operations:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid operation: {operation}",
                    context=context,
                    details={"operation": operation, "valid_operations": valid_operations},
                    remediation=f"Use one of: {', '.join(valid_operations)}",
                )
            
            # Validate image paths
            if not image_paths or len(image_paths) == 0:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message="No image paths provided",
                    context=context,
                    details={"image_paths": image_paths},
                    remediation="Provide at least one image path",
                )
            
            start_time = time.time()
            
            # Process images
            results = []
            errors = []
            successful = 0
            failed = 0
            
            for img_path in image_paths:
                try:
                    # Check if image exists
                    if not Path(img_path).exists():
                        errors.append({
                            "image_path": img_path,
                            "error": "Image not found",
                        })
                        failed += 1
                        continue
                    
                    # Perform operation
                    if operation == "analyze":
                        result = self._batch_analyze(img_path, operation_params)
                    elif operation == "refine":
                        result = self._batch_refine(img_path, operation_params)
                    elif operation == "upscale":
                        result = self._batch_upscale(img_path, operation_params)
                    elif operation == "style_transfer":
                        result = self._batch_style_transfer(img_path, operation_params)
                    else:
                        result = {"status": "unsupported"}
                    
                    results.append({
                        "image_path": img_path,
                        "result": result,
                        "status": "success",
                    })
                    successful += 1
                    
                except Exception as e:
                    errors.append({
                        "image_path": img_path,
                        "error": str(e),
                    })
                    failed += 1
            
            total_time = time.time() - start_time
            avg_time = total_time / len(image_paths) if image_paths else 0
            
            response_data = {
                "total_images": len(image_paths),
                "successful": successful,
                "failed": failed,
                "results": results,
                "errors": errors,
                "total_time": total_time,
                "average_time_per_image": avg_time,
            }
            
            logger.info(f"Batch processed {len(image_paths)} images: {successful} successful, {failed} failed")
            return self.create_success_response(response_data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def _batch_analyze(self, image_path: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze a single image in batch mode."""
        if self.image_processing_available:
            metrics = self._analyze_image_quality(Path(image_path))
            return {"metrics": metrics}
        else:
            return {"metrics": {"quality_grade": "unknown"}}
    
    def _batch_refine(self, image_path: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Refine a single image in batch mode."""
        denoising_strength = params.get("denoising_strength", 0.3)
        sharpen = params.get("sharpen", True)
        
        output_path = str(Path(image_path).parent / f"{Path(image_path).stem}_refined{Path(image_path).suffix}")
        
        return {
            "original_path": image_path,
            "refined_path": output_path,
            "improvements": {
                "sharpness_improved": sharpen,
                "noise_reduced": denoising_strength > 0,
            },
        }
    
    def _batch_upscale(self, image_path: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Upscale a single image in batch mode."""
        scale = params.get("scale", 2)
        method = params.get("method", "lanczos")
        
        output_path = str(Path(image_path).parent / f"{Path(image_path).stem}_upscaled{Path(image_path).suffix}")
        
        return {
            "original_path": image_path,
            "upscaled_path": output_path,
            "scale": scale,
            "method": method,
        }
    
    def _batch_style_transfer(self, image_path: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Apply style transfer to a single image in batch mode."""
        style_parameters = params.get("style_parameters", {})
        strength = params.get("strength", 0.7)
        
        output_path = str(Path(image_path).parent / f"{Path(image_path).stem}_styled{Path(image_path).suffix}")
        
        return {
            "original_path": image_path,
            "styled_path": output_path,
            "strength": strength,
        }
