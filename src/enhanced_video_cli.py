#!/usr/bin/env python3
"""
Enhanced Video CLI Integration

This module provides CLI commands for the Enhanced Video Engine,
integrating advanced ComfyUI workflows with the existing StoryCore pipeline.

Key Features:
- Advanced video generation commands
- Workflow selection and configuration
- Quality validation and monitoring
- Performance analytics
- Fallback management
- Integration with existing CLI structure
"""

import asyncio
import json
import logging
import time
from pathlib import Path
from typing import Dict, List, Optional, Any
import click
from PIL import Image

# Import enhanced video engine components
try:
    from .enhanced_video_engine import (
        EnhancedVideoEngine,
        AdvancedVideoConfig,
        AdvancedVideoResult,
        AdvancedVideoMode,
        WorkflowSelectionStrategy,
        create_enhanced_video_engine
    )
    from .advanced_workflow_manager import AdvancedWorkflowManager
    from .video_engine import VideoEngine
    from .project_manager import ProjectManager
except ImportError:
    # Fallback for standalone usage
    from enhanced_video_engine import (
        EnhancedVideoEngine,
        AdvancedVideoConfig,
        AdvancedVideoResult,
        AdvancedVideoMode,
        WorkflowSelectionStrategy,
        create_enhanced_video_engine
    )
    from advanced_workflow_manager import AdvancedWorkflowManager
    from video_engine import VideoEngine
    from project_manager import ProjectManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class EnhancedVideoCLI:
    """Enhanced Video CLI handler with advanced workflow integration"""
    
    def __init__(self, project_manager: Optional[ProjectManager] = None):
        """Initialize Enhanced Video CLI"""
        self.project_manager = project_manager
        self.enhanced_engine: Optional[EnhancedVideoEngine] = None
        self.workflow_manager: Optional[AdvancedWorkflowManager] = None
        self.legacy_engine: Optional[VideoEngine] = None
        
        # CLI state
        self.current_project: Optional[str] = None
        self.last_generation_result: Optional[AdvancedVideoResult] = None
        
        logger.info("Enhanced Video CLI initialized")
    
    async def initialize(self, project_name: Optional[str] = None) -> bool:
        """Initialize CLI components"""
        try:
            logger.info("Initializing Enhanced Video CLI components...")
            
            # Initialize workflow manager
            self.workflow_manager = AdvancedWorkflowManager()
            await self.workflow_manager.initialize()
            
            # Initialize legacy engine
            self.legacy_engine = VideoEngine()
            if hasattr(self.legacy_engine, 'initialize'):
                await self.legacy_engine.initialize()
            
            # Create enhanced engine
            self.enhanced_engine = await create_enhanced_video_engine(
                workflow_manager=self.workflow_manager,
                legacy_engine=self.legacy_engine,
                config={'cli_mode': True}
            )
            
            # Set current project
            if project_name:
                self.current_project = project_name
                logger.info(f"Set current project: {project_name}")
            
            logger.info("Enhanced Video CLI initialization completed")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize Enhanced Video CLI: {str(e)}")
            return False
    
    def create_config_from_args(self, **kwargs) -> AdvancedVideoConfig:
        """Create AdvancedVideoConfig from CLI arguments"""
        # Extract and validate arguments
        prompt = kwargs.get('prompt', '')
        if not prompt:
            raise ValueError("Prompt is required")
        
        # Basic video parameters
        width = kwargs.get('width', 832)
        height = kwargs.get('height', 480)
        num_frames = kwargs.get('num_frames', 33)
        fps = kwargs.get('fps', 16)
        
        # Generation parameters
        negative_prompt = kwargs.get('negative_prompt', '')
        guidance_scale = kwargs.get('guidance_scale', 6.0)
        num_inference_steps = kwargs.get('num_inference_steps', 20)
        seed = kwargs.get('seed')
        
        # Advanced workflow selection
        mode_str = kwargs.get('mode', 'auto')
        try:
            mode = AdvancedVideoMode(mode_str)
        except ValueError:
            logger.warning(f"Invalid mode '{mode_str}', using AUTO")
            mode = AdvancedVideoMode.AUTO
        
        strategy_str = kwargs.get('selection_strategy', 'balanced')
        try:
            selection_strategy = WorkflowSelectionStrategy(strategy_str)
        except ValueError:
            logger.warning(f"Invalid strategy '{strategy_str}', using BALANCED")
            selection_strategy = WorkflowSelectionStrategy.BALANCED
        
        # Quality requirements
        min_quality_score = kwargs.get('min_quality_score', 0.8)
        enable_quality_validation = kwargs.get('enable_quality_validation', True)
        quality_timeout = kwargs.get('quality_timeout', 30.0)
        
        # Performance requirements
        max_generation_time = kwargs.get('max_generation_time')
        enable_lightning = kwargs.get('enable_lightning', False)
        
        # Advanced features
        enable_alpha_channel = kwargs.get('enable_alpha_channel', False)
        transparency_threshold = kwargs.get('transparency_threshold', 0.5)
        enable_super_resolution = kwargs.get('enable_super_resolution', False)
        target_resolution = kwargs.get('target_resolution')
        if target_resolution and isinstance(target_resolution, str):
            try:
                w, h = target_resolution.split('x')
                target_resolution = (int(w), int(h))
            except ValueError:
                logger.warning(f"Invalid target resolution '{target_resolution}', ignoring")
                target_resolution = None
        
        # Input images
        input_image = None
        input_image_path = kwargs.get('input_image')
        if input_image_path:
            try:
                input_image = Image.open(input_image_path)
                logger.info(f"Loaded input image: {input_image_path}")
            except Exception as e:
                logger.error(f"Failed to load input image: {str(e)}")
        
        start_image = None
        start_image_path = kwargs.get('start_image')
        if start_image_path:
            try:
                start_image = Image.open(start_image_path)
                logger.info(f"Loaded start image: {start_image_path}")
            except Exception as e:
                logger.error(f"Failed to load start image: {str(e)}")
        
        end_image = None
        end_image_path = kwargs.get('end_image')
        if end_image_path:
            try:
                end_image = Image.open(end_image_path)
                logger.info(f"Loaded end image: {end_image_path}")
            except Exception as e:
                logger.error(f"Failed to load end image: {str(e)}")
        
        # Fallback configuration
        enable_fallback = kwargs.get('enable_fallback', True)
        fallback_to_legacy = kwargs.get('fallback_to_legacy', True)
        
        return AdvancedVideoConfig(
            prompt=prompt,
            negative_prompt=negative_prompt,
            width=width,
            height=height,
            num_frames=num_frames,
            fps=fps,
            guidance_scale=guidance_scale,
            num_inference_steps=num_inference_steps,
            seed=seed,
            mode=mode,
            selection_strategy=selection_strategy,
            min_quality_score=min_quality_score,
            enable_quality_validation=enable_quality_validation,
            quality_timeout=quality_timeout,
            max_generation_time=max_generation_time,
            enable_lightning=enable_lightning,
            enable_alpha_channel=enable_alpha_channel,
            transparency_threshold=transparency_threshold,
            enable_super_resolution=enable_super_resolution,
            target_resolution=target_resolution,
            input_image=input_image,
            start_image=start_image,
            end_image=end_image,
            enable_fallback=enable_fallback,
            fallback_to_legacy=fallback_to_legacy
        )
    
    async def generate_video(self, **kwargs) -> Dict[str, Any]:
        """Generate video using enhanced engine"""
        if not self.enhanced_engine:
            raise RuntimeError("Enhanced Video Engine not initialized")
        
        try:
            # Create configuration
            config = self.create_config_from_args(**kwargs)
            
            # Generate video
            logger.info("Starting enhanced video generation...")
            start_time = time.time()
            
            result = await self.enhanced_engine.generate_video(config)
            
            generation_time = time.time() - start_time
            logger.info(f"Video generation completed in {generation_time:.2f}s")
            
            # Store result for later reference
            self.last_generation_result = result
            
            # Prepare response
            response = {
                'success': result.success,
                'execution_time': result.execution_time,
                'workflow_used': result.workflow_used,
                'workflow_type': result.workflow_type,
                'quality_score': result.quality_score,
                'video_path': str(result.video_path) if result.video_path else None,
                'width': result.width,
                'height': result.height,
                'num_frames': result.num_frames,
                'fps': result.fps,
                'duration_seconds': result.duration_seconds,
                'has_alpha_channel': result.has_alpha_channel,
                'memory_used': result.memory_used,
                'quality_metrics': result.quality_metrics,
                'processing_stages': result.processing_stages,
                'metadata': result.metadata
            }
            
            if not result.success:
                response['error_message'] = result.error_message
            
            return response
            
        except Exception as e:
            logger.error(f"Video generation failed: {str(e)}")
            return {
                'success': False,
                'error_message': str(e),
                'execution_time': 0.0
            }
    
    async def list_workflows(self) -> Dict[str, Any]:
        """List available workflows"""
        if not self.enhanced_engine:
            raise RuntimeError("Enhanced Video Engine not initialized")
        
        try:
            workflows = self.enhanced_engine.get_available_workflows()
            return {
                'success': True,
                'workflows': workflows
            }
        except Exception as e:
            logger.error(f"Failed to list workflows: {str(e)}")
            return {
                'success': False,
                'error_message': str(e)
            }
    
    async def get_performance_stats(self) -> Dict[str, Any]:
        """Get performance statistics"""
        if not self.enhanced_engine:
            raise RuntimeError("Enhanced Video Engine not initialized")
        
        try:
            stats = self.enhanced_engine.get_performance_stats()
            return {
                'success': True,
                'stats': stats
            }
        except Exception as e:
            logger.error(f"Failed to get performance stats: {str(e)}")
            return {
                'success': False,
                'error_message': str(e)
            }
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check"""
        if not self.enhanced_engine:
            return {
                'success': False,
                'error_message': 'Enhanced Video Engine not initialized'
            }
        
        try:
            health = await self.enhanced_engine.health_check()
            return {
                'success': True,
                'health': health
            }
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return {
                'success': False,
                'error_message': str(e)
            }
    
    def get_last_result(self) -> Optional[Dict[str, Any]]:
        """Get last generation result"""
        if not self.last_generation_result:
            return None
        
        result = self.last_generation_result
        return {
            'success': result.success,
            'execution_time': result.execution_time,
            'workflow_used': result.workflow_used,
            'workflow_type': result.workflow_type,
            'quality_score': result.quality_score,
            'video_path': str(result.video_path) if result.video_path else None,
            'quality_metrics': result.quality_metrics,
            'metadata': result.metadata
        }


# Global CLI instance
enhanced_video_cli = EnhancedVideoCLI()


# Click command definitions
@click.group(name='enhanced-video')
def enhanced_video_group():
    """Enhanced video generation with advanced ComfyUI workflows"""
    pass


@enhanced_video_group.command('generate')
@click.option('--project', '-p', help='Project name')
@click.option('--prompt', '-pr', required=True, help='Text prompt for video generation')
@click.option('--negative-prompt', '-np', default='', help='Negative prompt')
@click.option('--width', '-w', default=832, type=int, help='Video width')
@click.option('--height', '-h', default=480, type=int, help='Video height')
@click.option('--num-frames', '-f', default=33, type=int, help='Number of frames')
@click.option('--fps', default=16, type=int, help='Frames per second')
@click.option('--mode', '-m', default='auto', 
              type=click.Choice(['auto', 'hunyuan_t2v', 'hunyuan_i2v', 'hunyuan_upscale', 
                               'wan_alpha_t2v', 'wan_inpainting', 'legacy']),
              help='Video generation mode')
@click.option('--selection-strategy', '-s', default='balanced',
              type=click.Choice(['capability_based', 'performance_based', 'quality_based', 
                               'balanced', 'user_preference']),
              help='Workflow selection strategy')
@click.option('--guidance-scale', '-g', default=6.0, type=float, help='Guidance scale')
@click.option('--num-inference-steps', '-n', default=20, type=int, help='Number of inference steps')
@click.option('--seed', type=int, help='Random seed for reproducibility')
@click.option('--min-quality-score', default=0.8, type=float, help='Minimum quality score')
@click.option('--enable-quality-validation/--disable-quality-validation', default=True,
              help='Enable quality validation')
@click.option('--enable-lightning/--disable-lightning', default=False,
              help='Enable lightning mode for faster generation')
@click.option('--enable-alpha-channel/--disable-alpha-channel', default=False,
              help='Enable alpha channel support')
@click.option('--transparency-threshold', default=0.5, type=float, help='Transparency threshold')
@click.option('--enable-super-resolution/--disable-super-resolution', default=False,
              help='Enable super-resolution')
@click.option('--target-resolution', help='Target resolution for super-resolution (e.g., 1664x960)')
@click.option('--input-image', type=click.Path(exists=True), help='Input image for I2V generation')
@click.option('--start-image', type=click.Path(exists=True), help='Start image for inpainting')
@click.option('--end-image', type=click.Path(exists=True), help='End image for inpainting')
@click.option('--enable-fallback/--disable-fallback', default=True,
              help='Enable fallback to alternative workflows')
@click.option('--output', '-o', help='Output file path')
@click.option('--verbose', '-v', is_flag=True, help='Verbose output')
def generate_video(**kwargs):
    """Generate video using enhanced workflows"""
    async def _generate():
        try:
            # Initialize CLI if needed
            if not enhanced_video_cli.enhanced_engine:
                success = await enhanced_video_cli.initialize(kwargs.get('project'))
                if not success:
                    click.echo("❌ Failed to initialize Enhanced Video CLI", err=True)
                    return
            
            # Generate video
            result = await enhanced_video_cli.generate_video(**kwargs)
            
            if result['success']:
                click.echo("✅ Video generation completed successfully!")
                click.echo(f"   Workflow: {result['workflow_used']} ({result['workflow_type']})")
                click.echo(f"   Quality Score: {result['quality_score']:.3f}")
                click.echo(f"   Generation Time: {result['execution_time']:.2f}s")
                click.echo(f"   Resolution: {result['width']}x{result['height']}")
                click.echo(f"   Duration: {result['duration_seconds']:.2f}s ({result['num_frames']} frames)")
                
                if result['video_path']:
                    click.echo(f"   Output: {result['video_path']}")
                
                if result['has_alpha_channel']:
                    click.echo("   ✨ Alpha channel included")
                
                if kwargs.get('verbose'):
                    click.echo(f"   Memory Used: {result['memory_used']:.1f} GB")
                    click.echo(f"   Processing Stages: {', '.join(result['processing_stages'])}")
                    if result['quality_metrics']:
                        click.echo("   Quality Metrics:")
                        for metric, value in result['quality_metrics'].items():
                            click.echo(f"     {metric}: {value:.3f}")
            else:
                click.echo("❌ Video generation failed!", err=True)
                click.echo(f"   Error: {result['error_message']}", err=True)
        
        except Exception as e:
            click.echo(f"❌ Command failed: {str(e)}", err=True)
    
    # Run async function
    asyncio.run(_generate())


@enhanced_video_group.command('workflows')
@click.option('--verbose', '-v', is_flag=True, help='Verbose output')
def list_workflows(verbose):
    """List available video generation workflows"""
    async def _list():
        try:
            # Initialize CLI if needed
            if not enhanced_video_cli.enhanced_engine:
                success = await enhanced_video_cli.initialize()
                if not success:
                    click.echo("❌ Failed to initialize Enhanced Video CLI", err=True)
                    return
            
            # Get workflows
            result = await enhanced_video_cli.list_workflows()
            
            if result['success']:
                workflows = result['workflows']
                
                click.echo("🎬 Available Video Generation Workflows:")
                click.echo()
                
                # Advanced workflows
                if workflows['advanced']:
                    click.echo("Advanced Workflows:")
                    for workflow_id in workflows['advanced']:
                        click.echo(f"  • {workflow_id}")
                        if verbose and workflow_id in workflows['details']:
                            details = workflows['details'][workflow_id]
                            click.echo(f"    Capabilities: {', '.join([cap.value for cap in details['capabilities']])}")
                            click.echo(f"    Resolutions: {', '.join(details['supported_resolutions'])}")
                            if 'minimum_vram' in details['memory_requirements']:
                                click.echo(f"    Min VRAM: {details['memory_requirements']['minimum_vram']} GB")
                    click.echo()
                
                # Legacy workflows
                if workflows['legacy']:
                    click.echo("Legacy Workflows:")
                    for workflow_id in workflows['legacy']:
                        click.echo(f"  • {workflow_id}")
                    click.echo()
                
                # Available modes
                click.echo("Generation Modes:")
                for mode in workflows['modes']:
                    click.echo(f"  • {mode}")
                click.echo()
                
                # Selection strategies
                click.echo("Selection Strategies:")
                for strategy in workflows['strategies']:
                    click.echo(f"  • {strategy}")
            else:
                click.echo("❌ Failed to list workflows!", err=True)
                click.echo(f"   Error: {result['error_message']}", err=True)
        
        except Exception as e:
            click.echo(f"❌ Command failed: {str(e)}", err=True)
    
    # Run async function
    asyncio.run(_list())


@enhanced_video_group.command('stats')
@click.option('--verbose', '-v', is_flag=True, help='Verbose output')
def performance_stats(verbose):
    """Show performance statistics"""
    async def _stats():
        try:
            # Initialize CLI if needed
            if not enhanced_video_cli.enhanced_engine:
                success = await enhanced_video_cli.initialize()
                if not success:
                    click.echo("❌ Failed to initialize Enhanced Video CLI", err=True)
                    return
            
            # Get stats
            result = await enhanced_video_cli.get_performance_stats()
            
            if result['success']:
                stats = result['stats']
                
                click.echo("📊 Enhanced Video Engine Performance Statistics:")
                click.echo()
                
                # Overall stats
                click.echo("Overall Performance:")
                click.echo(f"  Total Generations: {stats['total_generations']}")
                click.echo(f"  Successful Generations: {stats['successful_generations']}")
                click.echo(f"  Success Rate: {stats['success_rate']:.1%}")
                click.echo(f"  Average Generation Time: {stats['average_generation_time']:.2f}s")
                click.echo(f"  Average Quality Score: {stats['average_quality_score']:.3f}")
                click.echo()
                
                # Workflow usage
                click.echo("Workflow Usage:")
                click.echo(f"  Advanced Workflows: {stats['advanced_workflow_usage']} ({stats['advanced_usage_rate']:.1%})")
                click.echo(f"  Legacy Fallback: {stats['legacy_fallback_usage']}")
                click.echo()
                
                # Workflow-specific stats
                if verbose and stats.get('workflow_stats'):
                    click.echo("Workflow-Specific Performance:")
                    for workflow_id, workflow_stats in stats['workflow_stats'].items():
                        click.echo(f"  {workflow_id}:")
                        click.echo(f"    Usage Count: {workflow_stats['usage_count']}")
                        click.echo(f"    Average Time: {workflow_stats['average_time']:.2f}s")
                        click.echo(f"    Average Quality: {workflow_stats['average_quality']:.3f}")
                    click.echo()
            else:
                click.echo("❌ Failed to get performance stats!", err=True)
                click.echo(f"   Error: {result['error_message']}", err=True)
        
        except Exception as e:
            click.echo(f"❌ Command failed: {str(e)}", err=True)
    
    # Run async function
    asyncio.run(_stats())


@enhanced_video_group.command('health')
def health_check():
    """Check system health"""
    async def _health():
        try:
            # Initialize CLI if needed
            if not enhanced_video_cli.enhanced_engine:
                success = await enhanced_video_cli.initialize()
                if not success:
                    click.echo("❌ Failed to initialize Enhanced Video CLI", err=True)
                    return
            
            # Get health status
            result = await enhanced_video_cli.health_check()
            
            if result['success']:
                health = result['health']
                status = health['status']
                
                # Status indicator
                if status == 'healthy':
                    click.echo("✅ Enhanced Video Engine is healthy")
                elif status == 'warning':
                    click.echo("⚠️  Enhanced Video Engine has warnings")
                elif status == 'degraded':
                    click.echo("🔶 Enhanced Video Engine is degraded")
                else:
                    click.echo("❌ Enhanced Video Engine is unhealthy")
                
                click.echo()
                
                # Component checks
                click.echo("Component Status:")
                for component, status in health['checks'].items():
                    if isinstance(status, str):
                        if status == 'healthy':
                            click.echo(f"  ✅ {component}: {status}")
                        elif status == 'available':
                            click.echo(f"  ✅ {component}: {status}")
                        elif status == 'unavailable':
                            click.echo(f"  ⚠️  {component}: {status}")
                        else:
                            click.echo(f"  ❌ {component}: {status}")
                    else:
                        click.echo(f"  📊 {component}: {status}")
                
                # Warnings
                if 'warnings' in health:
                    click.echo()
                    click.echo("Warnings:")
                    for warning in health['warnings']:
                        click.echo(f"  ⚠️  {warning}")
                
                # Error details
                if 'error' in health:
                    click.echo()
                    click.echo(f"Error: {health['error']}")
            else:
                click.echo("❌ Health check failed!", err=True)
                click.echo(f"   Error: {result['error_message']}", err=True)
        
        except Exception as e:
            click.echo(f"❌ Command failed: {str(e)}", err=True)
    
    # Run async function
    asyncio.run(_health())


@enhanced_video_group.command('last-result')
def last_result():
    """Show last generation result"""
    try:
        result = enhanced_video_cli.get_last_result()
        
        if result:
            click.echo("📹 Last Video Generation Result:")
            click.echo()
            click.echo(f"  Success: {'✅' if result['success'] else '❌'}")
            click.echo(f"  Workflow: {result['workflow_used']} ({result['workflow_type']})")
            click.echo(f"  Quality Score: {result['quality_score']:.3f}")
            click.echo(f"  Generation Time: {result['execution_time']:.2f}s")
            
            if result['video_path']:
                click.echo(f"  Output: {result['video_path']}")
            
            if result['quality_metrics']:
                click.echo("  Quality Metrics:")
                for metric, value in result['quality_metrics'].items():
                    click.echo(f"    {metric}: {value:.3f}")
        else:
            click.echo("No previous generation results found")
    
    except Exception as e:
        click.echo(f"❌ Command failed: {str(e)}", err=True)


# Integration with main CLI
def register_enhanced_video_commands(main_cli):
    """Register enhanced video commands with main CLI"""
    main_cli.add_command(enhanced_video_group)


if __name__ == "__main__":
    # Standalone usage
    enhanced_video_group()