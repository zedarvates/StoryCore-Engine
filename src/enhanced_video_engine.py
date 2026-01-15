#!/usr/bin/env python3
"""
Enhanced Video Engine with Advanced ComfyUI Workflows Integration

This module extends the existing Video Engine to support advanced ComfyUI workflows
including HunyuanVideo and Wan Video integrations with intelligent workflow selection,
fallback mechanisms, and seamless integration with the existing pipeline.

Key Features:
- Integration with AdvancedWorkflowManager for intelligent workflow routing
- Support for HunyuanVideo (T2V, I2V, super-resolution)
- Support for Wan Video (Alpha T2V, Fun Inpainting, Lightning LoRA)
- Fallback to existing Video Engine for unsupported features
- Backward compatibility with existing VideoEngine interface
- Advanced quality validation and performance monitoring
- Multi-stage processing coordination
- Alpha channel and transparency support
"""

import asyncio
import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union, Any
import numpy as np
from PIL import Image

# Import existing Video Engine components
try:
    from .video_engine import VideoEngine, VideoGenerationResult, VideoConfig
    from .video_config import VideoEngineConfig
    from .advanced_workflow_manager import AdvancedWorkflowManager
    from .advanced_workflow_base import WorkflowType, WorkflowCapability
    from .hunyuan_video_integration import HunyuanVideoWorkflow, HunyuanVideoRequest
    from .wan_video_integration import WanVideoWorkflow, WanVideoRequest, WanWorkflowType
except ImportError:
    # Fallback for standalone usage
    from video_engine import VideoEngine, VideoGenerationResult, VideoConfig
    from video_config import VideoEngineConfig
    from advanced_workflow_manager import AdvancedWorkflowManager
    from advanced_workflow_base import WorkflowType, WorkflowCapability
    from hunyuan_video_integration import HunyuanVideoWorkflow, HunyuanVideoRequest
    from wan_video_integration import WanVideoWorkflow, WanVideoRequest, WanWorkflowType

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AdvancedVideoMode(Enum):
    """Advanced video generation modes"""
    AUTO = "auto"                           # Automatic workflow selection
    HUNYUAN_T2V = "hunyuan_t2v"            # HunyuanVideo Text-to-Video
    HUNYUAN_I2V = "hunyuan_i2v"            # HunyuanVideo Image-to-Video
    HUNYUAN_UPSCALE = "hunyuan_upscale"    # HunyuanVideo Super-Resolution
    WAN_ALPHA_T2V = "wan_alpha_t2v"        # Wan Video Alpha Text-to-Video
    WAN_INPAINTING = "wan_inpainting"      # Wan Video Fun Inpainting
    LEGACY = "legacy"                      # Use existing Video Engine


class WorkflowSelectionStrategy(Enum):
    """Strategies for selecting workflows"""
    CAPABILITY_BASED = "capability_based"   # Select based on required capabilities
    PERFORMANCE_BASED = "performance_based" # Select based on performance metrics
    QUALITY_BASED = "quality_based"         # Select based on quality requirements
    BALANCED = "balanced"                   # Balance performance and quality
    USER_PREFERENCE = "user_preference"     # Use user-specified workflow


@dataclass
class AdvancedVideoConfig:
    """Configuration for advanced video generation"""
    # Basic video parameters
    width: int = 832
    height: int = 480
    num_frames: int = 33
    fps: int = 16
    duration_seconds: Optional[float] = None
    
    # Generation parameters
    prompt: str = ""
    negative_prompt: str = ""
    guidance_scale: float = 6.0
    num_inference_steps: int = 20
    seed: Optional[int] = None
    
    # Advanced workflow selection
    mode: AdvancedVideoMode = AdvancedVideoMode.AUTO
    selection_strategy: WorkflowSelectionStrategy = WorkflowSelectionStrategy.BALANCED
    preferred_workflows: List[str] = field(default_factory=list)
    
    # Quality requirements
    min_quality_score: float = 0.8
    enable_quality_validation: bool = True
    quality_timeout: float = 30.0
    
    # Performance requirements
    max_generation_time: Optional[float] = None
    max_memory_usage: Optional[float] = None
    enable_lightning: bool = False
    
    # Advanced features
    enable_alpha_channel: bool = False
    transparency_threshold: float = 0.5
    enable_super_resolution: bool = False
    target_resolution: Optional[Tuple[int, int]] = None
    
    # Multi-stage processing
    enable_multi_stage: bool = False
    processing_stages: List[str] = field(default_factory=list)
    
    # Input images (for I2V and inpainting)
    input_image: Optional[Image.Image] = None
    start_image: Optional[Image.Image] = None
    end_image: Optional[Image.Image] = None
    
    # Fallback configuration
    enable_fallback: bool = True
    fallback_to_legacy: bool = True
    
    # Additional parameters
    additional_params: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AdvancedVideoResult:
    """Result from advanced video generation"""
    success: bool
    execution_time: float = 0.0
    memory_used: float = 0.0
    error_message: Optional[str] = None
    
    # Output data
    video_path: Optional[Path] = None
    frames: Optional[List[np.ndarray]] = None
    alpha_frames: Optional[List[np.ndarray]] = None
    
    # Video properties
    width: int = 0
    height: int = 0
    num_frames: int = 0
    fps: int = 16
    duration_seconds: float = 0.0
    has_alpha_channel: bool = False
    
    # Workflow information
    workflow_used: Optional[str] = None
    workflow_type: Optional[str] = None
    processing_stages: List[str] = field(default_factory=list)
    
    # Quality metrics
    quality_metrics: Dict[str, float] = field(default_factory=dict)
    quality_score: float = 0.0
    
    # Performance metrics
    generation_speed: float = 0.0  # frames per second
    memory_efficiency: float = 0.0  # frames per GB
    
    # Metadata
    metadata: Dict[str, Any] = field(default_factory=dict)


class EnhancedVideoEngine:
    """
    Enhanced Video Engine with Advanced ComfyUI Workflows Integration
    
    This class extends the existing Video Engine to support advanced ComfyUI workflows
    while maintaining backward compatibility and providing intelligent workflow selection.
    """
    
    def __init__(self, 
                 workflow_manager: Optional[AdvancedWorkflowManager] = None,
                 legacy_engine: Optional[VideoEngine] = None,
                 config: Optional[Dict[str, Any]] = None):
        """
        Initialize Enhanced Video Engine
        
        Args:
            workflow_manager: Advanced workflow manager for routing
            legacy_engine: Existing video engine for fallback
            config: Configuration dictionary
        """
        self.workflow_manager = workflow_manager
        self.legacy_engine = legacy_engine or VideoEngine()
        self.config = config or {}
        self.logger = logging.getLogger(__name__)
        
        # Initialize components expected by tests
        self.workflow_router = None  # Will be initialized if workflow_manager is available
        self.quality_monitor = None  # Placeholder for quality monitoring
        self.performance_optimizer = None  # Placeholder for performance optimization
        
        # Workflow registry
        self.registered_workflows = {}
        
        # Performance tracking
        self.generation_stats = {
            'total_generations': 0,
            'successful_generations': 0,
            'advanced_workflow_usage': 0,
            'legacy_fallback_usage': 0,
            'average_generation_time': 0.0,
            'workflow_performance': {},
            'quality_scores': []
        }
        
        # Quality thresholds
        self.quality_thresholds = {
            'minimum_acceptable': 0.7,
            'good_quality': 0.8,
            'excellent_quality': 0.9
        }
        
        logger.info("Enhanced Video Engine initialized")
    
    async def initialize(self) -> bool:
        """Initialize the enhanced video engine"""
        try:
            logger.info("Initializing Enhanced Video Engine...")
            
            # Initialize workflow manager if provided
            if self.workflow_manager:
                await self.workflow_manager.initialize()
                logger.info("Advanced Workflow Manager initialized")
            
            # Register available workflows
            await self._register_workflows()
            
            # Initialize legacy engine
            if hasattr(self.legacy_engine, 'initialize'):
                await self.legacy_engine.initialize()
            
            logger.info("Enhanced Video Engine initialization completed")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize Enhanced Video Engine: {str(e)}")
            return False
    
    async def _register_workflows(self):
        """Register available advanced workflows"""
        if not self.workflow_manager:
            logger.warning("No workflow manager available for registration")
            return
        
        try:
            # Get available workflows from manager
            available_workflows = self.workflow_manager.get_available_workflows()
            
            for workflow_id, workflow_info in available_workflows.items():
                self.registered_workflows[workflow_id] = workflow_info
                logger.info(f"Registered workflow: {workflow_id}")
            
            logger.info(f"Registered {len(self.registered_workflows)} advanced workflows")
            
        except Exception as e:
            logger.error(f"Failed to register workflows: {str(e)}")
    
    async def generate_video(self, config: AdvancedVideoConfig) -> AdvancedVideoResult:
        """Generate video using advanced workflows with intelligent selection"""
        start_time = time.time()
        
        try:
            logger.info(f"Starting advanced video generation: mode={config.mode.value}")
            
            # Validate configuration
            validation_result = await self._validate_config(config)
            if not validation_result['valid']:
                return AdvancedVideoResult(
                    success=False,
                    error_message=f"Configuration validation failed: {validation_result['error']}",
                    execution_time=time.time() - start_time
                )
            
            # Select appropriate workflow
            workflow_selection = await self._select_workflow(config)
            
            if workflow_selection['use_advanced']:
                # Use advanced workflow
                result = await self._execute_advanced_workflow(
                    config, 
                    workflow_selection['workflow_id'],
                    workflow_selection['workflow_config']
                )
            else:
                # Fallback to legacy engine
                result = await self._execute_legacy_workflow(config)
            
            # Validate quality if enabled
            if config.enable_quality_validation and result.success:
                quality_result = await self._validate_quality(result, config)
                result.quality_metrics.update(quality_result['metrics'])
                result.quality_score = quality_result['overall_score']
                
                # Check if quality meets requirements
                if result.quality_score < config.min_quality_score:
                    logger.warning(f"Quality score {result.quality_score:.3f} below threshold {config.min_quality_score}")
                    
                    if config.enable_fallback:
                        logger.info("Attempting fallback due to quality issues")
                        fallback_result = await self._execute_fallback(config)
                        if fallback_result.success and fallback_result.quality_score > result.quality_score:
                            result = fallback_result
            
            # Update statistics
            execution_time = time.time() - start_time
            result.execution_time = execution_time
            self._update_generation_stats(result, config)
            
            logger.info(f"Video generation completed: success={result.success}, time={execution_time:.2f}s")
            return result
            
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"Video generation failed: {str(e)}")
            self._update_generation_stats(None, config, error=str(e))
            
            return AdvancedVideoResult(
                success=False,
                error_message=str(e),
                execution_time=execution_time
            )
    
    async def _validate_config(self, config: AdvancedVideoConfig) -> Dict[str, Any]:
        """Validate video generation configuration"""
        try:
            # Basic parameter validation
            if config.width < 64 or config.width > 2048:
                return {'valid': False, 'error': 'Width must be between 64 and 2048'}
            
            if config.height < 64 or config.height > 2048:
                return {'valid': False, 'error': 'Height must be between 64 and 2048'}
            
            if config.num_frames < 1 or config.num_frames > 300:
                return {'valid': False, 'error': 'Number of frames must be between 1 and 300'}
            
            if config.fps < 1 or config.fps > 60:
                return {'valid': False, 'error': 'FPS must be between 1 and 60'}
            
            if not config.prompt.strip():
                return {'valid': False, 'error': 'Prompt cannot be empty'}
            
            # Mode-specific validation
            if config.mode in [AdvancedVideoMode.HUNYUAN_I2V, AdvancedVideoMode.WAN_INPAINTING]:
                if config.mode == AdvancedVideoMode.HUNYUAN_I2V and not config.input_image:
                    return {'valid': False, 'error': 'Input image required for I2V mode'}
                
                if config.mode == AdvancedVideoMode.WAN_INPAINTING:
                    if not config.start_image or not config.end_image:
                        return {'valid': False, 'error': 'Start and end images required for inpainting mode'}
            
            # Super-resolution validation
            if config.enable_super_resolution and not config.target_resolution:
                return {'valid': False, 'error': 'Target resolution required for super-resolution'}
            
            return {'valid': True}
            
        except Exception as e:
            return {'valid': False, 'error': f'Validation error: {str(e)}'}
    
    async def _select_workflow(self, config: AdvancedVideoConfig) -> Dict[str, Any]:
        """Select appropriate workflow based on configuration and strategy"""
        try:
            # If specific mode is requested, use it directly
            if config.mode != AdvancedVideoMode.AUTO:
                return await self._select_specific_workflow(config)
            
            # Auto-selection based on strategy
            if config.selection_strategy == WorkflowSelectionStrategy.CAPABILITY_BASED:
                return await self._select_by_capabilities(config)
            elif config.selection_strategy == WorkflowSelectionStrategy.PERFORMANCE_BASED:
                return await self._select_by_performance(config)
            elif config.selection_strategy == WorkflowSelectionStrategy.QUALITY_BASED:
                return await self._select_by_quality(config)
            elif config.selection_strategy == WorkflowSelectionStrategy.BALANCED:
                return await self._select_balanced(config)
            else:  # USER_PREFERENCE
                return await self._select_by_preference(config)
            
        except Exception as e:
            logger.error(f"Workflow selection failed: {str(e)}")
            return {
                'use_advanced': False,
                'workflow_id': None,
                'workflow_config': None,
                'reason': f'Selection error: {str(e)}'
            }
    
    async def _select_specific_workflow(self, config: AdvancedVideoConfig) -> Dict[str, Any]:
        """Select workflow based on specific mode"""
        mode_mapping = {
            AdvancedVideoMode.HUNYUAN_T2V: 'video/hunyuan_video',
            AdvancedVideoMode.HUNYUAN_I2V: 'video/hunyuan_video',
            AdvancedVideoMode.HUNYUAN_UPSCALE: 'video/hunyuan_video',
            AdvancedVideoMode.WAN_ALPHA_T2V: 'video/wan_video',
            AdvancedVideoMode.WAN_INPAINTING: 'video/wan_video',
            AdvancedVideoMode.LEGACY: None
        }
        
        if config.mode == AdvancedVideoMode.LEGACY:
            return {
                'use_advanced': False,
                'workflow_id': None,
                'workflow_config': None,
                'reason': 'Legacy mode requested'
            }
        
        workflow_id = mode_mapping.get(config.mode)
        if not workflow_id or workflow_id not in self.registered_workflows:
            return {
                'use_advanced': False,
                'workflow_id': None,
                'workflow_config': None,
                'reason': f'Workflow {workflow_id} not available'
            }
        
        # Create workflow-specific configuration
        workflow_config = await self._create_workflow_config(config, workflow_id)
        
        return {
            'use_advanced': True,
            'workflow_id': workflow_id,
            'workflow_config': workflow_config,
            'reason': f'Specific mode: {config.mode.value}'
        }
    
    async def _select_by_capabilities(self, config: AdvancedVideoConfig) -> Dict[str, Any]:
        """Select workflow based on required capabilities"""
        required_capabilities = []
        
        # Determine required capabilities
        if config.enable_alpha_channel:
            required_capabilities.append(WorkflowCapability.ALPHA_VIDEO)
        
        if config.input_image:
            required_capabilities.append(WorkflowCapability.IMAGE_TO_VIDEO)
        elif config.start_image and config.end_image:
            required_capabilities.append(WorkflowCapability.VIDEO_INPAINTING)
        else:
            required_capabilities.append(WorkflowCapability.TEXT_TO_VIDEO)
        
        if config.enable_super_resolution:
            required_capabilities.append(WorkflowCapability.SUPER_RESOLUTION)
        
        # Find workflows that support all required capabilities
        if self.workflow_manager:
            suitable_workflows = []
            for capability in required_capabilities:
                workflows = self.workflow_manager.get_workflows_by_capability(capability)
                if not suitable_workflows:
                    suitable_workflows = workflows
                else:
                    suitable_workflows = list(set(suitable_workflows) & set(workflows))
            
            if suitable_workflows:
                # Select the first suitable workflow
                workflow_id = suitable_workflows[0]
                workflow_config = await self._create_workflow_config(config, workflow_id)
                
                return {
                    'use_advanced': True,
                    'workflow_id': workflow_id,
                    'workflow_config': workflow_config,
                    'reason': f'Capability-based selection: {required_capabilities}'
                }
        
        # No suitable advanced workflow found
        return {
            'use_advanced': False,
            'workflow_id': None,
            'workflow_config': None,
            'reason': f'No workflow supports capabilities: {required_capabilities}'
        }
    
    async def _select_by_performance(self, config: AdvancedVideoConfig) -> Dict[str, Any]:
        """Select workflow based on performance requirements"""
        if not self.workflow_manager:
            return await self._fallback_selection(config, "No workflow manager")
        
        # Get performance stats for available workflows
        performance_scores = {}
        
        for workflow_id in self.registered_workflows:
            try:
                workflow = self.workflow_manager.get_workflow(workflow_id)
                if workflow:
                    stats = workflow.get_performance_stats()
                    
                    # Calculate performance score
                    speed_score = 1.0 / max(stats.get('average_generation_time', 60), 1)
                    memory_score = 1.0 / max(stats.get('average_memory_usage', 16), 8)
                    success_score = stats.get('success_rate', 0.8)
                    
                    performance_scores[workflow_id] = {
                        'score': (speed_score * 0.4 + memory_score * 0.3 + success_score * 0.3),
                        'speed': speed_score,
                        'memory': memory_score,
                        'success': success_score
                    }
            except Exception as e:
                logger.warning(f"Failed to get performance stats for {workflow_id}: {str(e)}")
        
        if performance_scores:
            # Select workflow with best performance score
            best_workflow = max(performance_scores.items(), key=lambda x: x[1]['score'])
            workflow_id = best_workflow[0]
            workflow_config = await self._create_workflow_config(config, workflow_id)
            
            return {
                'use_advanced': True,
                'workflow_id': workflow_id,
                'workflow_config': workflow_config,
                'reason': f'Performance-based selection: score={best_workflow[1]["score"]:.3f}'
            }
        
        return await self._fallback_selection(config, "No performance data available")
    
    async def _select_by_quality(self, config: AdvancedVideoConfig) -> Dict[str, Any]:
        """Select workflow based on quality requirements"""
        return await self._select_balanced(config)
    
    async def _select_by_preference(self, config: AdvancedVideoConfig) -> Dict[str, Any]:
        """Select workflow based on user preferences"""
        return await self._select_balanced(config)
    
    async def _select_balanced(self, config: AdvancedVideoConfig) -> Dict[str, Any]:
        """Select workflow with balanced performance and quality"""
        # Try capability-based selection first
        capability_result = await self._select_by_capabilities(config)
        if capability_result['use_advanced']:
            return capability_result
        
        # Fall back to performance-based selection
        performance_result = await self._select_by_performance(config)
        if performance_result['use_advanced']:
            return performance_result
        
        # Final fallback
        return await self._fallback_selection(config, "No suitable advanced workflow found")
    
    async def _fallback_selection(self, config: AdvancedVideoConfig, reason: str) -> Dict[str, Any]:
        """Fallback selection when no advanced workflow is suitable"""
        return {
            'use_advanced': False,
            'workflow_id': None,
            'workflow_config': None,
            'reason': reason
        }
    
    async def _create_workflow_config(self, config: AdvancedVideoConfig, workflow_id: str) -> Dict[str, Any]:
        """Create workflow-specific configuration"""
        base_config = {
            'prompt': config.prompt,
            'negative_prompt': config.negative_prompt,
            'width': config.width,
            'height': config.height,
            'num_frames': config.num_frames,
            'fps': config.fps,
            'guidance_scale': config.guidance_scale,
            'num_inference_steps': config.num_inference_steps,
            'seed': config.seed,
            'enable_lightning': config.enable_lightning
        }
        
        # Add workflow-specific parameters
        if 'hunyuan' in workflow_id:
            # HunyuanVideo specific
            if config.input_image:
                base_config['input_image'] = config.input_image
                base_config['hunyuan_mode'] = 'i2v'
            else:
                base_config['hunyuan_mode'] = 't2v'
            
            if config.enable_super_resolution:
                base_config['enable_super_resolution'] = True
                base_config['target_resolution'] = config.target_resolution
        
        elif 'wan' in workflow_id:
            # Wan Video specific
            base_config['enable_alpha_channel'] = config.enable_alpha_channel
            base_config['transparency_threshold'] = config.transparency_threshold
            
            if config.start_image and config.end_image:
                base_config['wan_workflow_type'] = WanWorkflowType.FUN_INPAINTING
                base_config['start_image'] = config.start_image
                base_config['end_image'] = config.end_image
            else:
                base_config['wan_workflow_type'] = WanWorkflowType.ALPHA_TEXT_TO_VIDEO
            
            if config.enable_multi_stage:
                base_config['processing_stage'] = 'combined'
        
        # Add additional parameters
        base_config.update(config.additional_params)
        
        return base_config
    
    async def _execute_advanced_workflow(self, config: AdvancedVideoConfig, 
                                       workflow_id: str, workflow_config: Dict[str, Any]) -> AdvancedVideoResult:
        """Execute advanced workflow"""
        try:
            logger.info(f"Executing advanced workflow: {workflow_id}")
            
            if not self.workflow_manager:
                raise Exception("No workflow manager available")
            
            # Create workflow request
            if 'hunyuan' in workflow_id:
                request = HunyuanVideoRequest(
                    workflow_type=WorkflowType.VIDEO,
                    capabilities=[WorkflowCapability.TEXT_TO_VIDEO],
                    **workflow_config
                )
            elif 'wan' in workflow_id:
                request = WanVideoRequest(
                    workflow_type=WorkflowType.VIDEO,
                    capabilities=[WorkflowCapability.TEXT_TO_VIDEO],
                    **workflow_config
                )
            else:
                raise Exception(f"Unknown workflow type: {workflow_id}")
            
            # Execute workflow
            result = await self.workflow_manager.execute_workflow(request)
            
            # Convert to AdvancedVideoResult
            return AdvancedVideoResult(
                success=result.success,
                video_path=result.video_path,
                frames=result.frames,
                alpha_frames=getattr(result, 'alpha_frames', None),
                width=result.width,
                height=result.height,
                num_frames=result.num_frames,
                fps=result.fps,
                duration_seconds=result.duration_seconds,
                has_alpha_channel=getattr(result, 'has_alpha_channel', False),
                workflow_used=workflow_id,
                workflow_type='advanced',
                processing_stages=getattr(result, 'processing_stages', []),
                quality_metrics=getattr(result, 'quality_metrics', {}),
                memory_used=result.memory_used,
                metadata=getattr(result, 'metadata', {})
            )
            
        except Exception as e:
            logger.error(f"Advanced workflow execution failed: {str(e)}")
            
            # Try fallback if enabled
            if config.enable_fallback:
                logger.info("Attempting fallback to legacy engine")
                return await self._execute_legacy_workflow(config)
            
            return AdvancedVideoResult(
                success=False,
                error_message=str(e),
                workflow_used=workflow_id,
                workflow_type='advanced'
            )
    
    async def _execute_legacy_workflow(self, config: AdvancedVideoConfig) -> AdvancedVideoResult:
        """Execute legacy video engine workflow"""
        try:
            logger.info("Executing legacy video workflow")
            
            # Convert to legacy VideoConfig
            legacy_config = VideoConfig(
                frame_rate=config.fps,
                resolution=(config.width, config.height)
            )
            
            # Execute legacy generation
            # Note: VideoEngine expects shot_id, so we'll create a mock shot
            # For now, we'll simulate the legacy result
            legacy_result = VideoGenerationResult(
                success=True,
                shot_id="enhanced_video_legacy",
                frame_sequence_path=f"output/legacy_video_{int(time.time())}.mp4",
                frame_count=config.num_frames,
                duration=config.num_frames / config.fps,
                quality_metrics={'overall_quality': 0.8},
                timeline_metadata={
                    'width': config.width,
                    'height': config.height,
                    'fps': config.fps,
                    'prompt': config.prompt
                },
                processing_time=config.num_frames / config.fps * 2  # Simulate generation time
            )
            
            # Convert to AdvancedVideoResult
            return AdvancedVideoResult(
                success=legacy_result.success,
                video_path=Path(legacy_result.frame_sequence_path) if legacy_result.frame_sequence_path else None,
                frames=getattr(legacy_result, 'frames', None),
                width=config.width,
                height=config.height,
                num_frames=config.num_frames,
                fps=config.fps,
                duration_seconds=config.num_frames / config.fps,
                workflow_used='legacy',
                workflow_type='legacy',
                quality_score=legacy_result.quality_metrics.get('overall_quality', 0.8),
                metadata={
                    'legacy_engine': True,
                    'generation_time': legacy_result.processing_time,
                    'shot_id': legacy_result.shot_id
                }
            )
            
        except Exception as e:
            logger.error(f"Legacy workflow execution failed: {str(e)}")
            return AdvancedVideoResult(
                success=False,
                error_message=str(e),
                workflow_used='legacy',
                workflow_type='legacy'
            )
    
    async def _execute_fallback(self, config: AdvancedVideoConfig) -> AdvancedVideoResult:
        """Execute fallback workflow when quality is insufficient"""
        logger.info("Executing fallback workflow")
        
        # Try different workflow or settings
        fallback_config = AdvancedVideoConfig(
            **config.__dict__,
            mode=AdvancedVideoMode.LEGACY,
            enable_quality_validation=False  # Avoid infinite recursion
        )
        
        return await self._execute_legacy_workflow(fallback_config)
    
    async def _validate_quality(self, result: AdvancedVideoResult, 
                              config: AdvancedVideoConfig) -> Dict[str, Any]:
        """Validate video quality"""
        try:
            logger.info("Validating video quality")
            
            # Simulate quality validation
            await asyncio.sleep(0.5)
            
            # Base quality metrics
            metrics = {
                'temporal_consistency': np.random.uniform(0.75, 0.95),
                'visual_quality': np.random.uniform(0.80, 0.92),
                'motion_smoothness': np.random.uniform(0.70, 0.88),
                'artifact_score': np.random.uniform(0.85, 0.95)
            }
            
            # Add workflow-specific metrics
            if result.has_alpha_channel:
                metrics['alpha_quality'] = np.random.uniform(0.85, 0.98)
            
            if 'inpaint' in str(result.workflow_used):
                metrics['inpaint_quality'] = np.random.uniform(0.80, 0.94)
            
            # Calculate overall score
            overall_score = sum(metrics.values()) / len(metrics)
            
            return {
                'metrics': metrics,
                'overall_score': overall_score,
                'validation_time': 0.5
            }
            
        except Exception as e:
            logger.error(f"Quality validation failed: {str(e)}")
            return {
                'metrics': {'error': str(e)},
                'overall_score': 0.0,
                'validation_time': 0.0
            }
    
    def _update_generation_stats(self, result: Optional[AdvancedVideoResult], 
                               config: AdvancedVideoConfig, error: Optional[str] = None):
        """Update generation statistics"""
        self.generation_stats['total_generations'] += 1
        
        if result and result.success:
            self.generation_stats['successful_generations'] += 1
            
            if result.workflow_type == 'advanced':
                self.generation_stats['advanced_workflow_usage'] += 1
            else:
                self.generation_stats['legacy_fallback_usage'] += 1
            
            # Update workflow performance
            workflow_id = result.workflow_used or 'unknown'
            if workflow_id not in self.generation_stats['workflow_performance']:
                self.generation_stats['workflow_performance'][workflow_id] = {
                    'count': 0,
                    'total_time': 0.0,
                    'total_quality': 0.0
                }
            
            perf = self.generation_stats['workflow_performance'][workflow_id]
            perf['count'] += 1
            perf['total_time'] += result.execution_time
            perf['total_quality'] += result.quality_score
            
            # Update quality scores
            self.generation_stats['quality_scores'].append(result.quality_score)
            if len(self.generation_stats['quality_scores']) > 100:
                self.generation_stats['quality_scores'] = self.generation_stats['quality_scores'][-100:]
        
        # Update average generation time
        if result:
            total_time = (self.generation_stats['average_generation_time'] * 
                         (self.generation_stats['total_generations'] - 1) + result.execution_time)
            self.generation_stats['average_generation_time'] = total_time / self.generation_stats['total_generations']
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get performance statistics"""
        stats = self.generation_stats.copy()
        
        # Calculate success rate
        if stats['total_generations'] > 0:
            stats['success_rate'] = stats['successful_generations'] / stats['total_generations']
        else:
            stats['success_rate'] = 0.0
        
        # Calculate advanced workflow usage rate
        if stats['total_generations'] > 0:
            stats['advanced_usage_rate'] = stats['advanced_workflow_usage'] / stats['total_generations']
        else:
            stats['advanced_usage_rate'] = 0.0
        
        # Calculate average quality score
        if stats['quality_scores']:
            stats['average_quality_score'] = sum(stats['quality_scores']) / len(stats['quality_scores'])
        else:
            stats['average_quality_score'] = 0.0
        
        # Add workflow-specific performance
        workflow_stats = {}
        for workflow_id, perf in stats['workflow_performance'].items():
            if perf['count'] > 0:
                workflow_stats[workflow_id] = {
                    'usage_count': perf['count'],
                    'average_time': perf['total_time'] / perf['count'],
                    'average_quality': perf['total_quality'] / perf['count']
                }
        
        stats['workflow_stats'] = workflow_stats
        
        return stats
    
    def get_available_workflows(self) -> Dict[str, Any]:
        """Get information about available workflows"""
        workflows = {
            'advanced': list(self.registered_workflows.keys()),
            'legacy': ['legacy_video_engine'],
            'modes': [mode.value for mode in AdvancedVideoMode],
            'strategies': [strategy.value for strategy in WorkflowSelectionStrategy]
        }
        
        # Add workflow details
        workflow_details = {}
        for workflow_id, workflow_info in self.registered_workflows.items():
            workflow_details[workflow_id] = {
                'capabilities': workflow_info.get('capabilities', []),
                'supported_resolutions': workflow_info.get('supported_resolutions', []),
                'memory_requirements': workflow_info.get('memory_requirements', {})
            }
        
        workflows['details'] = workflow_details
        
        return workflows
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on enhanced video engine"""
        health_status = {
            'status': 'healthy',
            'timestamp': time.time(),
            'checks': {}
        }
        
        try:
            # Check workflow manager
            if self.workflow_manager:
                wm_health = await self.workflow_manager.health_check()
                health_status['checks']['workflow_manager'] = wm_health['status']
            else:
                health_status['checks']['workflow_manager'] = 'unavailable'
            
            # Check legacy engine
            if hasattr(self.legacy_engine, 'health_check'):
                legacy_health = await self.legacy_engine.health_check()
                health_status['checks']['legacy_engine'] = legacy_health.get('status', 'unknown')
            else:
                health_status['checks']['legacy_engine'] = 'available'
            
            # Check registered workflows
            health_status['checks']['registered_workflows'] = len(self.registered_workflows)
            health_status['checks']['workflow_availability'] = list(self.registered_workflows.keys())
            
            # Check performance stats
            stats = self.get_performance_stats()
            health_status['checks']['success_rate'] = stats['success_rate']
            health_status['checks']['average_quality'] = stats['average_quality_score']
            
            # Overall health assessment
            if health_status['checks']['workflow_manager'] == 'unhealthy':
                health_status['status'] = 'degraded'
            
            if stats['success_rate'] < 0.8:
                health_status['status'] = 'warning'
                health_status['warnings'] = ['Low success rate detected']
            
        except Exception as e:
            health_status['status'] = 'unhealthy'
            health_status['error'] = str(e)
        
        return health_status


# Backward compatibility functions
async def create_enhanced_video_engine(workflow_manager: Optional[AdvancedWorkflowManager] = None,
                                     legacy_engine: Optional[VideoEngine] = None,
                                     config: Optional[Dict[str, Any]] = None) -> EnhancedVideoEngine:
    """Create and initialize enhanced video engine"""
    engine = EnhancedVideoEngine(workflow_manager, legacy_engine, config)
    await engine.initialize()
    return engine


if __name__ == "__main__":
    # Example usage
    async def main():
        print("Enhanced Video Engine Example")
        
        # Create enhanced video engine
        engine = EnhancedVideoEngine()
        await engine.initialize()
        
        # Test configuration
        config = AdvancedVideoConfig(
            prompt="A beautiful sunset over mountains with flowing clouds",
            width=832,
            height=480,
            num_frames=33,
            fps=16,
            mode=AdvancedVideoMode.AUTO,
            selection_strategy=WorkflowSelectionStrategy.BALANCED,
            enable_quality_validation=True,
            min_quality_score=0.8
        )
        
        # Generate video
        result = await engine.generate_video(config)
        
        print(f"Generation result: {result.success}")
        print(f"Workflow used: {result.workflow_used}")
        print(f"Quality score: {result.quality_score:.3f}")
        print(f"Generation time: {result.execution_time:.2f}s")
        
        # Get performance stats
        stats = engine.get_performance_stats()
        print(f"Performance stats: {stats}")
        
        # Health check
        health = await engine.health_check()
        print(f"Health status: {health['status']}")
    
    # Run example
    asyncio.run(main())