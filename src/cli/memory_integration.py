"""
Memory System Integration for CLI Handlers.

This module provides helper functions for integrating memory system logging
into StoryCore pipeline commands.
"""

from pathlib import Path
from typing import Dict, Any, Optional
import json


def is_memory_system_enabled(project_path: Path) -> bool:
    """
    Check if memory system is enabled for a project.
    
    Args:
        project_path: Path to the project directory
        
    Returns:
        True if memory system is enabled, False otherwise
    """
    try:
        config_path = project_path / "project_config.json"
        
        if not config_path.exists():
            return False
        
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        return config.get("memory_system_enabled", False)
    
    except Exception:
        return False


def log_pipeline_action(
    project_path: Path,
    action_type: str,
    affected_files: Optional[list] = None,
    parameters: Optional[Dict[str, Any]] = None,
    triggered_by: str = "pipeline"
) -> bool:
    """
    Log a pipeline action to the memory system build log.
    
    Args:
        project_path: Path to the project directory
        action_type: Type of action (e.g., "GRID_GENERATED", "PANELS_PROMOTED")
        affected_files: List of affected file paths
        parameters: Additional action parameters
        triggered_by: What triggered this action
        
    Returns:
        True if logged successfully, False otherwise
    """
    try:
        # Check if memory system is enabled
        if not is_memory_system_enabled(project_path):
            return False
        
        # Import BuildLogger only if needed
        from src.memory_system.build_logger import BuildLogger
        
        # Create logger and log action
        logger = BuildLogger(project_path)
        return logger.log_action(
            action_type=action_type,
            affected_files=affected_files or [],
            parameters=parameters or {},
            triggered_by=triggered_by
        )
    
    except Exception as e:
        # Silently fail to avoid disrupting pipeline
        # Memory system logging is optional
        return False


def log_grid_generation(
    project_path: Path,
    grid_spec: str,
    grid_path: str,
    panel_count: int,
    cell_size: int
) -> bool:
    """
    Log grid generation action.
    
    Args:
        project_path: Path to the project directory
        grid_spec: Grid specification (e.g., "3x3")
        grid_path: Path to generated grid file
        panel_count: Number of panels generated
        cell_size: Cell size in pixels
        
    Returns:
        True if logged successfully, False otherwise
    """
    return log_pipeline_action(
        project_path=project_path,
        action_type="GRID_GENERATED",
        affected_files=[grid_path],
        parameters={
            "grid_spec": grid_spec,
            "panel_count": str(panel_count),
            "cell_size": str(cell_size)
        },
        triggered_by="grid_handler"
    )


def log_panel_promotion(
    project_path: Path,
    panel_count: int,
    scale_factor: int,
    method: str,
    output_dir: str
) -> bool:
    """
    Log panel promotion action.
    
    Args:
        project_path: Path to the project directory
        panel_count: Number of panels promoted
        scale_factor: Scale factor used
        method: Upscaling method used
        output_dir: Output directory path
        
    Returns:
        True if logged successfully, False otherwise
    """
    return log_pipeline_action(
        project_path=project_path,
        action_type="PANELS_PROMOTED",
        affected_files=[output_dir],
        parameters={
            "panel_count": str(panel_count),
            "scale_factor": str(scale_factor),
            "method": method
        },
        triggered_by="promote_handler"
    )


def log_qa_scoring(
    project_path: Path,
    overall_score: float,
    threshold: float,
    passed: bool,
    issues_count: int
) -> bool:
    """
    Log QA scoring action.
    
    Args:
        project_path: Path to the project directory
        overall_score: Overall QA score
        threshold: Quality threshold used
        passed: Whether QA passed
        issues_count: Number of issues found
        
    Returns:
        True if logged successfully, False otherwise
    """
    return log_pipeline_action(
        project_path=project_path,
        action_type="QA_SCORING_COMPLETED",
        affected_files=["qa_reports/"],
        parameters={
            "overall_score": str(overall_score),
            "threshold": str(threshold),
            "passed": str(passed),
            "issues_count": str(issues_count)
        },
        triggered_by="qa_handler"
    )


def log_project_export(
    project_path: Path,
    export_format: str,
    export_location: str,
    file_count: int
) -> bool:
    """
    Log project export action.
    
    Args:
        project_path: Path to the project directory
        export_format: Export format used
        export_location: Export location path
        file_count: Number of files exported
        
    Returns:
        True if logged successfully, False otherwise
    """
    return log_pipeline_action(
        project_path=project_path,
        action_type="PROJECT_EXPORTED",
        affected_files=[export_location],
        parameters={
            "format": export_format,
            "file_count": str(file_count)
        },
        triggered_by="export_handler"
    )


def index_generated_assets(
    project_path: Path,
    asset_paths: list,
    asset_type: str,
    generation_context: Optional[Dict[str, Any]] = None
) -> bool:
    """
    Index generated assets in the memory system.
    
    This function indexes assets that are already in the assets directory
    (generated by the pipeline) rather than copying them from elsewhere.
    
    Args:
        project_path: Path to the project directory
        asset_paths: List of paths to generated assets (already in assets dir)
        asset_type: Type of assets ("image", "audio", "video")
        generation_context: Additional context about generation
        
    Returns:
        True if indexed successfully, False otherwise
        
    Validates: Requirement 16.3
    """
    try:
        # Check if memory system is enabled
        if not is_memory_system_enabled(project_path):
            return False
        
        # Import AssetManager and AssetType only if needed
        from src.memory_system.asset_manager import AssetManager
        from src.memory_system.data_models import AssetType, AssetInfo
        from datetime import datetime
        
        # Map string type to AssetType enum
        type_mapping = {
            "image": AssetType.IMAGE,
            "audio": AssetType.AUDIO,
            "video": AssetType.VIDEO,
            "document": AssetType.DOCUMENT
        }
        
        asset_type_enum = type_mapping.get(asset_type.lower(), AssetType.DOCUMENT)
        
        # Create asset manager
        asset_manager = AssetManager(project_path)
        
        # Index each asset (without copying, since they're already in place)
        indexed_count = 0
        for asset_path in asset_paths:
            asset_path_obj = Path(asset_path)
            
            # Skip if asset doesn't exist
            if not asset_path_obj.exists():
                continue
            
            # Generate description from context
            description = _generate_asset_description(
                asset_path_obj,
                asset_type,
                generation_context
            )
            
            # Generate metadata
            metadata = asset_manager.generate_asset_metadata(asset_path_obj)
            
            # Create asset info for the existing file
            asset_info = AssetInfo(
                filename=asset_path_obj.name,
                path=asset_path_obj,
                type=asset_type_enum,
                size_bytes=asset_path_obj.stat().st_size,
                timestamp=datetime.now().isoformat(),
                description=description,
                metadata=metadata
            )
            
            # Update index (without storing/copying the file)
            if asset_manager.update_index(asset_info):
                indexed_count += 1
        
        # Update asset summary if any assets were indexed
        if indexed_count > 0:
            asset_manager.summarize_assets()
            
            # Log the indexing action
            log_pipeline_action(
                project_path=project_path,
                action_type="ASSETS_INDEXED",
                affected_files=[str(p) for p in asset_paths],
                parameters={
                    "asset_type": asset_type,
                    "count": str(indexed_count),
                    "generation_context": str(generation_context) if generation_context else ""
                },
                triggered_by=f"{asset_type}_generation"
            )
        
        return indexed_count > 0
    
    except Exception as e:
        # Silently fail to avoid disrupting pipeline
        # Memory system integration is optional
        return False


def _generate_asset_description(
    asset_path: Path,
    asset_type: str,
    context: Optional[Dict[str, Any]]
) -> str:
    """
    Generate a description for an asset based on context.
    
    Args:
        asset_path: Path to the asset
        asset_type: Type of asset
        context: Generation context
        
    Returns:
        Description string
    """
    parts = []
    
    # Add type-specific prefix
    parts.append(f"Generated {asset_type}")
    
    # Add context information if available
    if context:
        if "shot_id" in context:
            parts.append(f"for shot {context['shot_id']}")
        if "workflow" in context:
            parts.append(f"using {context['workflow']}")
        if "prompt" in context:
            prompt = context["prompt"]
            if len(prompt) > 50:
                prompt = prompt[:47] + "..."
            parts.append(f"with prompt: {prompt}")
    
    return " ".join(parts)
