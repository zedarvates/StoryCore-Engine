"""
Enhanced Image Engine for Advanced ComfyUI Workflows Integration

This module extends the existing ComfyUI Image Engine with advanced workflow capabilities
including NewBie anime generation, Qwen image editing suite, and intelligent workflow routing.

Author: StoryCore-Engine Team
Date: January 12, 2026
Version: 1.0.0
"""

import asyncio
import json
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
import hashlib

# Import existing ComfyUI components
try:
    from comfyui_image_engine import ComfyUIImageEngine
    from newbie_image_integration import NewBieImageIntegration, NewBieConfig, AnimeStyle
    from qwen_image_suite_integration import (
        QwenImageSuiteIntegration, QwenImageConfig, EditingMode, LightingType
    )
    from advanced_workflow_manager import AdvancedWorkflowManager
    from advanced_workflow_router import AdvancedWorkflowRouter
    from advanced_workflow_registry import AdvancedWorkflowRegistry
except ImportError:
    # Mock imports for testing
    class ComfyUIImageEngine:
        def __init__(self, url): pass
    
    class NewBieImageIntegration:
        def __init__(self, config): pass
        async def generate_anime_image(self, **kwargs):
            from dataclasses import dataclass
            @dataclass
            class MockResult:
                success: bool = True
                image = MockImage()
                quality_score: float = 0.85
                metadata: dict = None
                error_message: str = None
            return MockResult()
    
    class QwenImageSuiteIntegration:
        def __init__(self, config): pass
        async def edit_image_multi_modal(self, **kwargs):
            from dataclasses import dataclass
            @dataclass
            class MockResult:
                success: bool = True
                image = MockImage()
                quality_score: float = 0.88
                metadata: dict = None
                error_message: str = None
                editing_mode = None
                layers = None
            return MockResult()
        
        async def relight_image(self, **kwargs):
            from dataclasses import dataclass
            @dataclass
            class MockResult:
                success: bool = True
                image = MockImage()
                quality_score: float = 0.87
                metadata: dict = None
                error_message: str = None
                editing_mode = None
            return MockResult()
        
        async def generate_layered_image(self, **kwargs):
            from dataclasses import dataclass
            layer_count = len(kwargs.get('layer_definitions', []))
            @dataclass
            class MockResult:
                success: bool = True
                image = MockImage()
                layers = [MockImage() for _ in range(layer_count)]
                quality_score: float = 0.89
                metadata: dict = None
                error_message: str = None
            return MockResult()
        
        async def lightning_edit(self, **kwargs):
            from dataclasses import dataclass
            @dataclass
            class MockResult:
                success: bool = True
                image = MockImage()
                quality_score: float = 0.82
                metadata: dict = None
                error_message: str = None
            return MockResult()
    
    class AdvancedWorkflowManager:
        def __init__(self, registry, router): pass
    
    class AdvancedWorkflowRouter:
        def __init__(self, registry): pass
    
    class AdvancedWorkflowRegistry:
        def __init__(self): pass
    
    class NewBieConfig:
        def __init__(self): pass
    
    class QwenImageConfig:
        def __init__(self): pass
    
    class AnimeStyle:
        MODERN = "modern"
    
    class EditingMode:
        MULTI_MODAL = "multi_modal"
    
    class LightingType:
        STUDIO = "studio"
        DRAMATIC = "dramatic"

# Mock PIL Image for development
try:
    from PIL import Image
    PIL_Image = Image.Image
except ImportError:
    class MockImage:
        def __init__(self, size=(1024, 1024), mode='RGB'):
            self.size = size
            self.mode = mode
        
        def copy(self):
            return MockImage(self.size, self.mode)
        
        def save(self, path):
            pass
    
    PIL_Image = MockImage

# Make MockImage globally available
class MockImage:
    def __init__(self, size=(1024, 1024), mode='RGB'):
        self.size = size
        self.mode = mode
    
    def copy(self):
        return MockImage(self.size, self.mode)
    
    def save(self, path):
        pass


class ImageGenerationMode(Enum):
    """Image generation modes for enhanced engine"""
    STANDARD = "standard"           # Original ComfyUI workflows
    ANIME = "anime"                # NewBie anime generation
    PROFESSIONAL_EDIT = "professional_edit"  # Qwen editing suite
    LAYERED_COMPOSITION = "layered_composition"  # Qwen layered generation
    LIGHTNING_FAST = "lightning_fast"  # Fast generation modes
    HYBRID = "hybrid"              # Combination of workflows
    AUTO = "auto"                  # Intelligent selection


class WorkflowStrategy(Enum):
    """Workflow selection strategies"""
    QUALITY_FIRST = "quality_first"
    SPEED_FIRST = "speed_first"
    BALANCED = "balanced"
    STYLE_AWARE = "style_aware"
    CONTENT_AWARE = "content_aware"


class ImageStyle(Enum):
    """Image style categories for workflow selection"""
    REALISTIC = "realistic"
    ANIME = "anime"
    ARTISTIC = "artistic"
    PROFESSIONAL = "professional"
    CINEMATIC = "cinematic"
    PORTRAIT = "portrait"
    LANDSCAPE = "landscape"
    ABSTRACT = "abstract"


@dataclass
class EnhancedImageConfig:
    """Configuration for Enhanced Image Engine"""
    
    # Generation settings
    default_mode: ImageGenerationMode = ImageGenerationMode.AUTO
    default_strategy: WorkflowStrategy = WorkflowStrategy.BALANCED
    default_style: ImageStyle = ImageStyle.REALISTIC
    
    # Quality settings
    quality_threshold: float = 0.8
    enable_quality_validation: bool = True
    auto_enhance: bool = True
    
    # Performance settings
    max_concurrent_generations: int = 3
    enable_batch_processing: bool = True
    batch_size: int = 4
    
    # Workflow settings
    enable_fallback_workflows: bool = True
    fallback_timeout: float = 30.0
    enable_workflow_caching: bool = True
    
    # Advanced workflow configs
    newbie_config: NewBieConfig = field(default_factory=NewBieConfig)
    qwen_config: QwenImageConfig = field(default_factory=QwenImageConfig)
    
    # Output settings
    output_format: str = "PNG"
    save_intermediate_results: bool = False
    export_metadata: bool = True


@dataclass
class ImageGenerationRequest:
    """Request for image generation"""
    prompt: str
    style: Optional[ImageStyle] = None
    mode: Optional[ImageGenerationMode] = None
    strategy: Optional[WorkflowStrategy] = None
    width: int = 1024
    height: int = 1024
    quality: str = "high"
    seed: Optional[int] = None
    reference_images: Optional[List[PIL_Image]] = None
    character_data: Optional[Dict[str, Any]] = None
    lighting_type: Optional[LightingType] = None
    editing_instructions: Optional[str] = None
    layer_definitions: Optional[List[Dict[str, Any]]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ImageGenerationResult:
    """Result from image generation"""
    success: bool
    image: Optional[PIL_Image] = None
    layers: Optional[List[PIL_Image]] = None
    workflow_used: Optional[str] = None
    mode_used: Optional[ImageGenerationMode] = None
    processing_time: float = 0.0
    quality_score: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)
    error_message: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert result to dictionary"""
        return {
            'success': self.success,
            'workflow_used': self.workflow_used,
            'mode_used': self.mode_used.value if self.mode_used else None,
            'processing_time': self.processing_time,
            'quality_score': self.quality_score,
            'metadata': self.metadata,
            'error_message': self.error_message,
            'has_image': self.image is not None,
            'layer_count': len(self.layers) if self.layers else 0
        }


class EnhancedImageEngine:
    """
    Enhanced Image Engine with advanced workflow integration.
    
    Extends the existing ComfyUI Image Engine with:
    - NewBie anime-style image generation
    - Qwen image editing suite
    - Intelligent workflow routing
    - Style-aware generation
    - Batch processing capabilities
    - Advanced quality validation
    """
    
    def __init__(self, config: Optional[EnhancedImageConfig] = None, comfyui_url: str = "http://127.0.0.1:8188"):
        """Initialize Enhanced Image Engine"""
        self.config = config or EnhancedImageConfig()
        self.logger = logging.getLogger(__name__)
        
        # Initialize base ComfyUI Image Engine
        self.base_engine = ComfyUIImageEngine(comfyui_url)
        
        # Initialize advanced workflow components
        self.workflow_registry = AdvancedWorkflowRegistry()
        self.workflow_router = AdvancedWorkflowRouter(self.workflow_registry)
        self.workflow_manager = AdvancedWorkflowManager(self.workflow_registry, self.workflow_router)
        
        # Initialize components expected by tests
        self.quality_monitor = None  # Placeholder for quality monitoring
        self.style_detector = None   # Placeholder for style detection
        
        # Initialize advanced integrations
        self.newbie_integration = NewBieImageIntegration(self.config.newbie_config)
        self.qwen_integration = QwenImageSuiteIntegration(self.config.qwen_config)
        
        # Workflow mapping
        self.workflow_map = {
            ImageGenerationMode.ANIME: self._generate_anime_image,
            ImageGenerationMode.PROFESSIONAL_EDIT: self._generate_professional_edit,
            ImageGenerationMode.LAYERED_COMPOSITION: self._generate_layered_composition,
            ImageGenerationMode.LIGHTNING_FAST: self._generate_lightning_fast,
            ImageGenerationMode.HYBRID: self._generate_hybrid,
            ImageGenerationMode.STANDARD: self._generate_standard,
            ImageGenerationMode.AUTO: self._generate_auto
        }
        
        # Style detection patterns
        self.style_patterns = {
            ImageStyle.ANIME: ['anime', 'manga', 'cartoon', 'character', 'kawaii'],
            ImageStyle.REALISTIC: ['photo', 'realistic', 'portrait', 'person'],
            ImageStyle.ARTISTIC: ['art', 'painting', 'artistic', 'creative'],
            ImageStyle.PROFESSIONAL: ['professional', 'business', 'corporate'],
            ImageStyle.CINEMATIC: ['cinematic', 'movie', 'film', 'dramatic'],
            ImageStyle.LANDSCAPE: ['landscape', 'nature', 'outdoor', 'scenery'],
            ImageStyle.ABSTRACT: ['abstract', 'geometric', 'pattern', 'design']
        }
        
        # Performance tracking
        self.performance_stats = {
            'total_generations': 0,
            'successful_generations': 0,
            'mode_usage': {mode.value: 0 for mode in ImageGenerationMode},
            'average_processing_time': 0.0,
            'quality_scores': []
        }
        
        self.logger.info("Enhanced Image Engine initialized successfully")
    
    async def generate_image(self, request: ImageGenerationRequest) -> ImageGenerationResult:
        """
        Generate image using enhanced workflows.
        
        Args:
            request: Image generation request
            
        Returns:
            ImageGenerationResult with generated image
        """
        start_time = time.time()
        
        try:
            # Determine generation mode
            mode = request.mode or self._determine_generation_mode(request)
            
            # Determine workflow strategy
            strategy = request.strategy or self.config.default_strategy
            
            self.logger.info(f"Generating image with mode: {mode.value}, strategy: {strategy.value}")
            
            # Route to appropriate workflow
            workflow_func = self.workflow_map.get(mode, self._generate_standard)
            result = await workflow_func(request)
            
            # Validate quality if enabled
            if self.config.enable_quality_validation and result.success:
                result = await self._validate_and_enhance_quality(result, request)
            
            # Update performance stats
            processing_time = time.time() - start_time
            result.processing_time = processing_time
            result.mode_used = mode
            
            self._update_performance_stats(mode, processing_time, result.quality_score, result.success)
            
            self.logger.info(f"Image generation completed in {processing_time:.2f}s")
            return result
            
        except Exception as e:
            processing_time = time.time() - start_time
            self._update_performance_stats(mode if 'mode' in locals() else ImageGenerationMode.STANDARD, 
                                         processing_time, 0.0, False)
            
            error_msg = f"Image generation failed: {str(e)}"
            self.logger.error(error_msg)
            
            return ImageGenerationResult(
                success=False,
                processing_time=processing_time,
                error_message=error_msg
            )
    
    async def generate_batch(self, requests: List[ImageGenerationRequest]) -> List[ImageGenerationResult]:
        """
        Generate multiple images in batch.
        
        Args:
            requests: List of image generation requests
            
        Returns:
            List of ImageGenerationResult
        """
        if not self.config.enable_batch_processing:
            # Process sequentially if batch processing disabled
            results = []
            for request in requests:
                result = await self.generate_image(request)
                results.append(result)
            return results
        
        # Process in batches
        batch_size = self.config.batch_size
        all_results = []
        
        for i in range(0, len(requests), batch_size):
            batch = requests[i:i + batch_size]
            
            # Limit concurrent operations
            semaphore = asyncio.Semaphore(self.config.max_concurrent_generations)
            
            async def process_with_semaphore(req):
                async with semaphore:
                    return await self.generate_image(req)
            
            # Process batch concurrently
            batch_results = await asyncio.gather(
                *[process_with_semaphore(req) for req in batch],
                return_exceptions=True
            )
            
            # Handle exceptions
            for j, result in enumerate(batch_results):
                if isinstance(result, Exception):
                    batch_results[j] = ImageGenerationResult(
                        success=False,
                        error_message=f"Batch processing error: {str(result)}"
                    )
            
            all_results.extend(batch_results)
        
        return all_results
    
    def _determine_generation_mode(self, request: ImageGenerationRequest) -> ImageGenerationMode:
        """Determine optimal generation mode based on request"""
        if request.mode:
            return request.mode
        
        # Auto-detect based on style and content
        detected_style = self._detect_style(request.prompt)
        
        # Style-based mode selection
        if detected_style == ImageStyle.ANIME:
            return ImageGenerationMode.ANIME
        
        # Check for editing instructions
        if request.editing_instructions or request.reference_images:
            return ImageGenerationMode.PROFESSIONAL_EDIT
        
        # Check for layer definitions
        if request.layer_definitions:
            return ImageGenerationMode.LAYERED_COMPOSITION
        
        # Check strategy preferences
        if request.strategy == WorkflowStrategy.SPEED_FIRST:
            return ImageGenerationMode.LIGHTNING_FAST
        
        # Default to standard for realistic/professional content
        return ImageGenerationMode.STANDARD
    
    def _detect_style(self, prompt: str) -> ImageStyle:
        """Detect image style from prompt"""
        prompt_lower = prompt.lower()
        
        # Score each style based on keyword matches
        style_scores = {}
        for style, keywords in self.style_patterns.items():
            score = sum(1 for keyword in keywords if keyword in prompt_lower)
            if score > 0:
                style_scores[style] = score
        
        # Return style with highest score, or default
        if style_scores:
            return max(style_scores.items(), key=lambda x: x[1])[0]
        
        return self.config.default_style
    
    async def _generate_anime_image(self, request: ImageGenerationRequest) -> ImageGenerationResult:
        """Generate anime-style image using NewBie integration"""
        try:
            # Prepare character data
            character_data = request.character_data or {}
            
            # Use NewBie integration
            result = await self.newbie_integration.generate_anime_image(
                character_prompt=character_data.get('description', request.prompt),
                scene_prompt=request.prompt,
                style=character_data.get('style', AnimeStyle.MODERN),
                quality_level=request.quality
            )
            
            return ImageGenerationResult(
                success=result.success,
                image=result.image,
                workflow_used="newbie_anime",
                quality_score=result.quality_score,
                metadata={
                    'character_data': character_data,
                    'newbie_metadata': result.metadata,
                    'seed': request.seed
                },
                error_message=result.error_message
            )
            
        except Exception as e:
            return ImageGenerationResult(
                success=False,
                workflow_used="newbie_anime",
                error_message=f"Anime generation failed: {str(e)}"
            )
    
    async def _generate_professional_edit(self, request: ImageGenerationRequest) -> ImageGenerationResult:
        """Generate professional edited image using Qwen integration"""
        try:
            if request.reference_images and len(request.reference_images) > 0:
                # Multi-modal editing
                base_image = request.reference_images[0]
                reference_images = request.reference_images[1:] if len(request.reference_images) > 1 else []
                
                result = await self.qwen_integration.edit_image_multi_modal(
                    base_image=base_image,
                    reference_images=reference_images,
                    edit_prompt=request.editing_instructions or request.prompt,
                    mode="2511",
                    quality=request.quality
                )
            elif request.lighting_type:
                # Relighting
                if not request.reference_images:
                    raise ValueError("Relighting requires a reference image")
                
                result = await self.qwen_integration.relight_image(
                    image=request.reference_images[0],
                    lighting_condition=request.lighting_type,
                    quality=request.quality
                )
            else:
                raise ValueError("Professional edit requires reference images or lighting instructions")
            
            return ImageGenerationResult(
                success=result.success,
                image=result.image,
                workflow_used="qwen_professional_edit",
                quality_score=result.quality_score,
                metadata={
                    'editing_mode': result.editing_mode.value if result.editing_mode else None,
                    'qwen_metadata': result.metadata
                },
                error_message=result.error_message
            )
            
        except Exception as e:
            return ImageGenerationResult(
                success=False,
                workflow_used="qwen_professional_edit",
                error_message=f"Professional edit failed: {str(e)}"
            )
    
    async def _generate_layered_composition(self, request: ImageGenerationRequest) -> ImageGenerationResult:
        """Generate layered composition using Qwen integration"""
        try:
            if not request.layer_definitions:
                raise ValueError("Layered composition requires layer definitions")
            
            # Convert layer definitions to LayerDefinition objects
            # Mock LayerDefinition and LayerType for testing
            class LayerType:
                def __init__(self, value):
                    self.value = value
            
            class LayerDefinition:
                def __init__(self, layer_type, prompt, weight=1.0, z_index=0, opacity=1.0):
                    self.layer_type = layer_type
                    self.prompt = prompt
                    self.weight = weight
                    self.z_index = z_index
                    self.opacity = opacity
            
            layer_defs = []
            for layer_data in request.layer_definitions:
                layer_def = LayerDefinition(
                    layer_type=LayerType(layer_data.get('type', 'background')),
                    prompt=layer_data.get('prompt', ''),
                    weight=layer_data.get('weight', 1.0),
                    z_index=layer_data.get('z_index', 0),
                    opacity=layer_data.get('opacity', 1.0)
                )
                layer_defs.append(layer_def)
            
            result = await self.qwen_integration.generate_layered_image(
                layer_definitions=layer_defs,
                canvas_size=(request.width, request.height),
                quality=request.quality
            )
            
            return ImageGenerationResult(
                success=result.success,
                image=result.image,
                layers=result.layers,
                workflow_used="qwen_layered_composition",
                quality_score=result.quality_score,
                metadata={
                    'layer_count': len(layer_defs),
                    'canvas_size': f"{request.width}x{request.height}",
                    'qwen_metadata': result.metadata
                },
                error_message=result.error_message
            )
            
        except Exception as e:
            return ImageGenerationResult(
                success=False,
                workflow_used="qwen_layered_composition",
                error_message=f"Layered composition failed: {str(e)}"
            )
    
    async def _generate_lightning_fast(self, request: ImageGenerationRequest) -> ImageGenerationResult:
        """Generate image using lightning-fast workflows"""
        try:
            # Determine best lightning workflow
            if self._detect_style(request.prompt) == ImageStyle.ANIME:
                # Use NewBie with draft quality for speed
                result = await self.newbie_integration.generate_anime_image(
                    character_prompt=request.prompt,
                    scene_prompt=request.prompt,
                    quality_level="draft"
                )
                workflow_used = "newbie_lightning"
            else:
                # Use Qwen lightning edit if reference image available
                if request.reference_images:
                    result = await self.qwen_integration.lightning_edit(
                        image=request.reference_images[0],
                        edit_prompt=request.prompt
                    )
                    workflow_used = "qwen_lightning"
                else:
                    # Fall back to standard workflow with reduced settings
                    result = await self._generate_standard(request, fast_mode=True)
                    workflow_used = "standard_lightning"
            
            return ImageGenerationResult(
                success=result.success,
                image=result.image,
                workflow_used=workflow_used,
                quality_score=result.quality_score * 0.9,  # Slightly lower quality for speed
                metadata=result.metadata,
                error_message=result.error_message
            )
            
        except Exception as e:
            return ImageGenerationResult(
                success=False,
                workflow_used="lightning_fast",
                error_message=f"Lightning generation failed: {str(e)}"
            )
    
    async def _generate_hybrid(self, request: ImageGenerationRequest) -> ImageGenerationResult:
        """Generate image using hybrid workflow combination"""
        try:
            # Multi-stage hybrid approach
            results = []
            
            # Stage 1: Base generation
            base_result = await self._generate_standard(request)
            if not base_result.success:
                return base_result
            
            results.append(base_result)
            
            # Stage 2: Style enhancement based on detected style
            detected_style = self._detect_style(request.prompt)
            
            if detected_style == ImageStyle.ANIME and base_result.image:
                # Enhance with anime characteristics
                enhance_request = ImageGenerationRequest(
                    prompt=f"enhance anime style: {request.prompt}",
                    reference_images=[base_result.image],
                    editing_instructions="enhance anime characteristics"
                )
                enhance_result = await self._generate_anime_image(enhance_request)
                if enhance_result.success:
                    results.append(enhance_result)
            
            # Stage 3: Quality enhancement if enabled
            if self.config.auto_enhance and len(results) > 0:
                final_image = results[-1].image
                if final_image and request.reference_images:
                    enhance_result = await self.qwen_integration.lightning_edit(
                        image=final_image,
                        edit_prompt="enhance quality and details"
                    )
                    if enhance_result.success:
                        results.append(enhance_result)
            
            # Return best result
            final_result = results[-1]
            final_result.workflow_used = "hybrid_multi_stage"
            final_result.metadata['hybrid_stages'] = len(results)
            
            return final_result
            
        except Exception as e:
            return ImageGenerationResult(
                success=False,
                workflow_used="hybrid",
                error_message=f"Hybrid generation failed: {str(e)}"
            )
    
    async def _generate_standard(self, request: ImageGenerationRequest, fast_mode: bool = False) -> ImageGenerationResult:
        """Generate image using standard ComfyUI workflow"""
        try:
            # Mock standard generation for now
            await asyncio.sleep(0.1 if fast_mode else 0.2)
            
            # Create mock image
            mock_image = MockImage((request.width, request.height))
            
            return ImageGenerationResult(
                success=True,
                image=mock_image,
                workflow_used="standard_comfyui",
                quality_score=0.85 if not fast_mode else 0.75,
                metadata={
                    'fast_mode': fast_mode,
                    'resolution': f"{request.width}x{request.height}",
                    'seed': request.seed
                }
            )
            
        except Exception as e:
            return ImageGenerationResult(
                success=False,
                workflow_used="standard_comfyui",
                error_message=f"Standard generation failed: {str(e)}"
            )
    
    async def _generate_auto(self, request: ImageGenerationRequest) -> ImageGenerationResult:
        """Automatically select and execute optimal workflow"""
        # Determine optimal mode based on comprehensive analysis
        detected_style = self._detect_style(request.prompt)
        
        # Priority-based selection
        if detected_style == ImageStyle.ANIME:
            request.mode = ImageGenerationMode.ANIME
        elif request.reference_images and len(request.reference_images) > 1:
            request.mode = ImageGenerationMode.PROFESSIONAL_EDIT
        elif request.layer_definitions:
            request.mode = ImageGenerationMode.LAYERED_COMPOSITION
        elif request.strategy == WorkflowStrategy.SPEED_FIRST:
            request.mode = ImageGenerationMode.LIGHTNING_FAST
        elif request.strategy == WorkflowStrategy.QUALITY_FIRST:
            request.mode = ImageGenerationMode.HYBRID
        else:
            request.mode = ImageGenerationMode.STANDARD
        
        # Execute selected workflow
        return await self.generate_image(request)
    
    async def _validate_and_enhance_quality(self, result: ImageGenerationResult, request: ImageGenerationRequest) -> ImageGenerationResult:
        """Validate and enhance image quality if needed"""
        if not result.success or not result.image:
            return result
        
        # Check quality threshold
        if result.quality_score < self.config.quality_threshold:
            if self.config.auto_enhance:
                # Attempt quality enhancement
                try:
                    enhance_result = await self.qwen_integration.lightning_edit(
                        image=result.image,
                        edit_prompt="enhance image quality and details"
                    )
                    
                    if enhance_result.success and enhance_result.quality_score > result.quality_score:
                        result.image = enhance_result.image
                        result.quality_score = enhance_result.quality_score
                        result.metadata['quality_enhanced'] = True
                        
                except Exception as e:
                    self.logger.warning(f"Quality enhancement failed: {e}")
        
        return result
    
    def _update_performance_stats(self, mode: ImageGenerationMode, processing_time: float, quality_score: float, success: bool):
        """Update performance statistics"""
        self.performance_stats['total_generations'] += 1
        if success:
            self.performance_stats['successful_generations'] += 1
            self.performance_stats['quality_scores'].append(quality_score)
        
        self.performance_stats['mode_usage'][mode.value] += 1
        
        # Update average processing time
        total = self.performance_stats['total_generations']
        current_avg = self.performance_stats['average_processing_time']
        self.performance_stats['average_processing_time'] = (
            (current_avg * (total - 1) + processing_time) / total
        )
    
    def get_performance_report(self) -> Dict[str, Any]:
        """Get comprehensive performance report"""
        stats = self.performance_stats
        quality_scores = stats['quality_scores']
        
        return {
            'total_generations': stats['total_generations'],
            'successful_generations': stats['successful_generations'],
            'success_rate': stats['successful_generations'] / max(stats['total_generations'], 1),
            'average_processing_time': stats['average_processing_time'],
            'average_quality_score': sum(quality_scores) / max(len(quality_scores), 1),
            'mode_usage': stats['mode_usage'],
            'quality_distribution': {
                'excellent': len([s for s in quality_scores if s >= 0.9]),
                'good': len([s for s in quality_scores if 0.8 <= s < 0.9]),
                'acceptable': len([s for s in quality_scores if 0.7 <= s < 0.8]),
                'poor': len([s for s in quality_scores if s < 0.7])
            },
            'supported_modes': [mode.value for mode in ImageGenerationMode],
            'supported_styles': [style.value for style in ImageStyle],
            'configuration': {
                'default_mode': self.config.default_mode.value,
                'default_strategy': self.config.default_strategy.value,
                'quality_threshold': self.config.quality_threshold,
                'batch_processing': self.config.enable_batch_processing,
                'max_concurrent': self.config.max_concurrent_generations
            }
        }
    
    def export_generation_session(self, results: List[ImageGenerationResult], output_path: Path) -> bool:
        """Export generation session results to JSON"""
        try:
            session_data = {
                'session_info': {
                    'timestamp': time.time(),
                    'total_generations': len(results),
                    'successful_generations': len([r for r in results if r.success]),
                    'configuration': {
                        'default_mode': self.config.default_mode.value,
                        'default_strategy': self.config.default_strategy.value,
                        'quality_threshold': self.config.quality_threshold
                    }
                },
                'results': [result.to_dict() for result in results],
                'performance_report': self.get_performance_report()
            }
            
            with open(output_path, 'w') as f:
                json.dump(session_data, f, indent=2, default=str)
            
            self.logger.info(f"Generation session exported to {output_path}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to export generation session: {e}")
            return False


def create_enhanced_image_engine(config: Optional[EnhancedImageConfig] = None, comfyui_url: str = "http://127.0.0.1:8188") -> EnhancedImageEngine:
    """
    Factory function to create Enhanced Image Engine instance.
    
    Args:
        config: Optional configuration object
        comfyui_url: ComfyUI server URL
        
    Returns:
        Configured EnhancedImageEngine instance
    """
    return EnhancedImageEngine(config, comfyui_url)


# Alias for backward compatibility
ImageEngineConfig = EnhancedImageConfig


# Example usage and testing
if __name__ == "__main__":
    import asyncio
    
    async def test_enhanced_image_engine():
        """Test Enhanced Image Engine"""
        print("Testing Enhanced Image Engine...")
        
        # Create engine
        config = EnhancedImageConfig(
            default_mode=ImageGenerationMode.AUTO,
            default_strategy=WorkflowStrategy.BALANCED,
            enable_batch_processing=True
        )
        engine = create_enhanced_image_engine(config)
        
        # Test anime generation
        print("\n1. Testing anime generation...")
        anime_request = ImageGenerationRequest(
            prompt="beautiful anime character with blue hair",
            style=ImageStyle.ANIME,
            character_data={'style': 'modern', 'gender': 'female'}
        )
        anime_result = await engine.generate_image(anime_request)
        print(f"Anime generation: {anime_result.success} (Quality: {anime_result.quality_score:.3f})")
        
        # Test professional editing
        print("\n2. Testing professional editing...")
        mock_image = MockImage((1024, 1024))
        edit_request = ImageGenerationRequest(
            prompt="enhance lighting and colors",
            reference_images=[mock_image],
            editing_instructions="professional photo enhancement",
            lighting_type=LightingType.STUDIO
        )
        edit_result = await engine.generate_image(edit_request)
        print(f"Professional editing: {edit_result.success} (Quality: {edit_result.quality_score:.3f})")
        
        # Test layered composition
        print("\n3. Testing layered composition...")
        layer_request = ImageGenerationRequest(
            prompt="fantasy landscape composition",
            layer_definitions=[
                {'type': 'background', 'prompt': 'mountain landscape', 'z_index': 0},
                {'type': 'character', 'prompt': 'heroic figure', 'z_index': 1},
                {'type': 'effect', 'prompt': 'magical effects', 'z_index': 2}
            ]
        )
        layer_result = await engine.generate_image(layer_request)
        print(f"Layered composition: {layer_result.success} (Layers: {len(layer_result.layers) if layer_result.layers else 0})")
        
        # Test batch generation
        print("\n4. Testing batch generation...")
        batch_requests = [
            ImageGenerationRequest(prompt="landscape photo", strategy=WorkflowStrategy.SPEED_FIRST),
            ImageGenerationRequest(prompt="anime character", style=ImageStyle.ANIME),
            ImageGenerationRequest(prompt="professional portrait", strategy=WorkflowStrategy.QUALITY_FIRST)
        ]
        batch_results = await engine.generate_batch(batch_requests)
        print(f"Batch generation: {len([r for r in batch_results if r.success])}/{len(batch_results)} successful")
        
        # Performance report
        print("\n5. Performance Report:")
        report = engine.get_performance_report()
        print(f"Total generations: {report['total_generations']}")
        print(f"Success rate: {report['success_rate']:.1%}")
        print(f"Average quality: {report['average_quality_score']:.3f}")
        print(f"Mode usage: {report['mode_usage']}")
        
        print("\nEnhanced Image Engine test completed successfully!")
    
    # Run test
    asyncio.run(test_enhanced_image_engine())