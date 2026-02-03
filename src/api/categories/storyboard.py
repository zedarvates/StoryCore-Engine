"""
Storyboard and Timeline API Category Handler

This module implements all storyboard and timeline endpoints including storyboard
lifecycle, shot management, and timeline generation.
"""

import logging
import json
import uuid
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime

from ..base_handler import BaseAPIHandler
from ..models import APIResponse, RequestContext, ErrorCodes
from ..config import APIConfig
from ..router import APIRouter

from .storyboard_models import (
    Shot,
    Storyboard,
    StoryboardCreateRequest,
    StoryboardCreateResult,
    ShotAddRequest,
    ShotAddResult,
    ShotUpdateRequest,
    ShotUpdateResult,
    ShotDeleteRequest,
    ShotDeleteResult,
    ShotReorderRequest,
    ShotReorderResult,
    Timeline,
    TimelineEntry,
    TimelineGenerateRequest,
    TimelineGenerateResult,
    StoryboardValidationIssue,
    StoryboardValidationResult,
    StoryboardExportRequest,
    StoryboardExportResult,
)


logger = logging.getLogger(__name__)


class StoryboardCategoryHandler(BaseAPIHandler):
    """
    Handler for Storyboard and Timeline API category.
    
    Implements 8 endpoints:
    - storycore.storyboard.create: Create storyboard from scene data
    - storycore.storyboard.shot.add: Add shot to storyboard
    - storycore.storyboard.shot.update: Update existing shot
    - storycore.storyboard.shot.delete: Delete shot from storyboard
    - storycore.storyboard.shot.reorder: Reorder shots in sequence
    - storycore.storyboard.timeline.generate: Generate timeline with durations
    - storycore.storyboard.export: Export storyboard in specified format
    - storycore.storyboard.validate: Validate storyboard completeness and consistency
    """
    
    def __init__(self, config: APIConfig, router: APIRouter):
        """Initialize the storyboard category handler."""
        super().__init__(config)
        self.router = router
        
        # In-memory storage for storyboards (keyed by storyboard_id)
        self.storyboards: Dict[str, Storyboard] = {}
        
        # Storage for timelines (keyed by storyboard_id)
        self.timelines: Dict[str, Timeline] = {}
        
        # Try to initialize storyboard engine if available
        self.storyboard_engine = None
        self._initialize_storyboard_engine()
        
        # Register all endpoints
        self.register_endpoints()
        
        logger.info("Initialized StoryboardCategoryHandler with 8 endpoints")
    
    def _initialize_storyboard_engine(self) -> None:
        """Initialize storyboard engine if available."""
        try:
            from storyboard_engine import StoryboardEngine
            self.storyboard_engine = StoryboardEngine()
            logger.info("Storyboard engine initialized successfully")
        except ImportError:
            logger.warning("StoryboardEngine not available, using mock mode")
            self.storyboard_engine = None
    
    def register_endpoints(self) -> None:
        """Register all storyboard and timeline endpoints with the router."""
        
        # Storyboard lifecycle endpoints (3)
        self.router.register_endpoint(
            path="storycore.storyboard.create",
            method="POST",
            handler=self.create,
            description="Create storyboard from scene data",
            async_capable=False,
        )
        
        self.router.register_endpoint(
            path="storycore.storyboard.validate",
            method="POST",
            handler=self.validate,
            description="Validate storyboard completeness and consistency",
            async_capable=False,
        )
        
        self.router.register_endpoint(
            path="storycore.storyboard.export",
            method="POST",
            handler=self.export,
            description="Export storyboard in specified format",
            async_capable=False,
        )
        
        # Shot management endpoints (4)
        self.router.register_endpoint(
            path="storycore.storyboard.shot.add",
            method="POST",
            handler=self.shot_add,
            description="Add shot to storyboard",
            async_capable=False,
        )
        
        self.router.register_endpoint(
            path="storycore.storyboard.shot.update",
            method="PUT",
            handler=self.shot_update,
            description="Update existing shot",
            async_capable=False,
        )
        
        self.router.register_endpoint(
            path="storycore.storyboard.shot.delete",
            method="DELETE",
            handler=self.shot_delete,
            description="Delete shot from storyboard",
            async_capable=False,
        )
        
        self.router.register_endpoint(
            path="storycore.storyboard.shot.reorder",
            method="PUT",
            handler=self.shot_reorder,
            description="Reorder shots in sequence",
            async_capable=False,
        )
        
        # Timeline endpoint (1)
        self.router.register_endpoint(
            path="storycore.storyboard.timeline.generate",
            method="POST",
            handler=self.timeline_generate,
            description="Generate timeline with durations",
            async_capable=False,
        )
    
    # Helper methods
    
    def _get_storyboard(self, storyboard_id: str) -> Optional[Storyboard]:
        """Get storyboard by ID."""
        return self.storyboards.get(storyboard_id)
    
    def _save_storyboard_to_disk(self, storyboard: Storyboard, base_path: str = ".") -> None:
        """Save storyboard to disk."""
        try:
            project_path = Path(base_path) / storyboard.project_name
            if not project_path.exists():
                return
            
            storyboard_file = project_path / "storyboard.json"
            
            # Convert to serializable format
            storyboard_data = {
                "storyboard_id": storyboard.storyboard_id,
                "project_name": storyboard.project_name,
                "title": storyboard.title,
                "description": storyboard.description,
                "total_duration_seconds": storyboard.total_duration_seconds,
                "created_at": storyboard.created_at.isoformat() if storyboard.created_at else None,
                "updated_at": storyboard.updated_at.isoformat() if storyboard.updated_at else None,
                "metadata": storyboard.metadata,
                "shots": [
                    {
                        "shot_id": shot.shot_id,
                        "description": shot.description,
                        "duration_seconds": shot.duration_seconds,
                        "camera_angle": shot.camera_angle,
                        "camera_movement": shot.camera_movement,
                        "composition": shot.composition,
                        "lighting": shot.lighting,
                        "visual_notes": shot.visual_notes,
                        "audio_notes": shot.audio_notes,
                        "sequence_number": shot.sequence_number,
                        "image_path": shot.image_path,
                        "metadata": shot.metadata,
                        "created_at": shot.created_at.isoformat() if shot.created_at else None,
                        "updated_at": shot.updated_at.isoformat() if shot.updated_at else None,
                    }
                    for shot in storyboard.shots
                ],
            }
            
            with open(storyboard_file, "w") as f:
                json.dump(storyboard_data, f, indent=2)
                
        except Exception as e:
            logger.warning(f"Failed to save storyboard to disk: {e}")
    
    def _load_storyboard_from_disk(self, project_name: str, base_path: str = ".") -> Optional[Storyboard]:
        """Load storyboard from disk."""
        try:
            project_path = Path(base_path) / project_name
            storyboard_file = project_path / "storyboard.json"
            
            if not storyboard_file.exists():
                return None
            
            with open(storyboard_file, "r") as f:
                data = json.load(f)
            
            # Convert to Storyboard object
            shots = [
                Shot(
                    shot_id=shot_data["shot_id"],
                    description=shot_data["description"],
                    duration_seconds=shot_data["duration_seconds"],
                    camera_angle=shot_data.get("camera_angle"),
                    camera_movement=shot_data.get("camera_movement"),
                    composition=shot_data.get("composition"),
                    lighting=shot_data.get("lighting"),
                    visual_notes=shot_data.get("visual_notes"),
                    audio_notes=shot_data.get("audio_notes"),
                    sequence_number=shot_data.get("sequence_number", 0),
                    image_path=shot_data.get("image_path"),
                    metadata=shot_data.get("metadata", {}),
                    created_at=datetime.fromisoformat(shot_data["created_at"]) if shot_data.get("created_at") else None,
                    updated_at=datetime.fromisoformat(shot_data["updated_at"]) if shot_data.get("updated_at") else None,
                )
                for shot_data in data.get("shots", [])
            ]
            
            storyboard = Storyboard(
                storyboard_id=data["storyboard_id"],
                project_name=data["project_name"],
                title=data["title"],
                description=data.get("description"),
                shots=shots,
                total_duration_seconds=data.get("total_duration_seconds", 0.0),
                created_at=datetime.fromisoformat(data["created_at"]) if data.get("created_at") else None,
                updated_at=datetime.fromisoformat(data["updated_at"]) if data.get("updated_at") else None,
                metadata=data.get("metadata", {}),
            )
            
            return storyboard
            
        except Exception as e:
            logger.warning(f"Failed to load storyboard from disk: {e}")
            return None
    
    def _recalculate_sequence_numbers(self, storyboard: Storyboard) -> None:
        """Recalculate sequence numbers for all shots."""
        for i, shot in enumerate(storyboard.shots):
            shot.sequence_number = i
    
    def _recalculate_total_duration(self, storyboard: Storyboard) -> None:
        """Recalculate total duration from all shots."""
        storyboard.total_duration_seconds = sum(shot.duration_seconds for shot in storyboard.shots)
    
    # Storyboard lifecycle endpoints
    
    def create(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Create storyboard from scene data.
        
        Endpoint: storycore.storyboard.create
        Requirements: 9.1
        """
        self.log_request("storycore.storyboard.create", params, context)
        
        try:
            # Validate required parameters
            error_response = self.validate_required_params(
                params, ["project_name", "title"], context
            )
            if error_response:
                return error_response
            
            # Extract parameters
            project_name = params["project_name"]
            title = params["title"]
            description = params.get("description")
            scene_data = params.get("scene_data")
            auto_generate_shots = params.get("auto_generate_shots", False)
            num_shots = params.get("num_shots")
            metadata = params.get("metadata", {})
            base_path = params.get("base_path", ".")
            
            # Generate unique storyboard ID
            storyboard_id = f"sb_{project_name}_{uuid.uuid4().hex[:8]}"
            
            # Check if storyboard already exists for this project
            existing = self._load_storyboard_from_disk(project_name, base_path)
            if existing:
                return self.create_error_response(
                    error_code=ErrorCodes.CONFLICT,
                    message=f"Storyboard already exists for project '{project_name}'",
                    context=context,
                    details={"existing_storyboard_id": existing.storyboard_id},
                    remediation="Use update operations or delete the existing storyboard first",
                )
            
            # Create storyboard
            now = datetime.now()
            storyboard = Storyboard(
                storyboard_id=storyboard_id,
                project_name=project_name,
                title=title,
                description=description,
                shots=[],
                total_duration_seconds=0.0,
                created_at=now,
                updated_at=now,
                metadata=metadata,
            )
            
            # Auto-generate shots if requested
            if auto_generate_shots and scene_data:
                # Use storyboard engine if available
                if self.storyboard_engine:
                    try:
                        result = self.storyboard_engine.generate_storyboard(
                            Path(base_path) / project_name,
                            num_shots=num_shots
                        )
                        # Engine would populate shots
                    except Exception as e:
                        logger.warning(f"Storyboard engine failed: {e}, using mock generation")
                        self._generate_mock_shots(storyboard, scene_data, num_shots)
                else:
                    self._generate_mock_shots(storyboard, scene_data, num_shots)
            
            # Store storyboard
            self.storyboards[storyboard_id] = storyboard
            
            # Save to disk
            self._save_storyboard_to_disk(storyboard, base_path)
            
            response_data = {
                "storyboard_id": storyboard.storyboard_id,
                "project_name": storyboard.project_name,
                "title": storyboard.title,
                "total_shots": len(storyboard.shots),
                "total_duration_seconds": storyboard.total_duration_seconds,
                "created_at": storyboard.created_at.isoformat(),
                "metadata": storyboard.metadata,
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.storyboard.create", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def _generate_mock_shots(self, storyboard: Storyboard, scene_data: Dict[str, Any], num_shots: Optional[int]) -> None:
        """Generate mock shots from scene data."""
        if not num_shots:
            num_shots = 5  # Default
        
        for i in range(num_shots):
            shot = Shot(
                shot_id=f"shot_{i+1:03d}",
                description=f"Shot {i+1}: {scene_data.get('description', 'Scene shot')}",
                duration_seconds=3.0,
                camera_angle="medium",
                camera_movement="static",
                composition="rule_of_thirds",
                sequence_number=i,
                created_at=datetime.now(),
                updated_at=datetime.now(),
            )
            storyboard.shots.append(shot)
        
        self._recalculate_total_duration(storyboard)
    
    def validate(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Validate storyboard completeness and consistency.
        
        Endpoint: storycore.storyboard.validate
        Requirements: 9.8
        """
        self.log_request("storycore.storyboard.validate", params, context)
        
        try:
            # Validate required parameters
            error_response = self.validate_required_params(
                params, ["storyboard_id"], context
            )
            if error_response:
                return error_response
            
            storyboard_id = params["storyboard_id"]
            base_path = params.get("base_path", ".")
            
            # Get storyboard
            storyboard = self._get_storyboard(storyboard_id)
            if not storyboard:
                # Try loading from disk
                project_name = params.get("project_name")
                if project_name:
                    storyboard = self._load_storyboard_from_disk(project_name, base_path)
                    if storyboard:
                        self.storyboards[storyboard.storyboard_id] = storyboard
                        storyboard_id = storyboard.storyboard_id
            
            if not storyboard:
                return self.create_error_response(
                    error_code=ErrorCodes.NOT_FOUND,
                    message=f"Storyboard '{storyboard_id}' not found",
                    context=context,
                    remediation="Check the storyboard ID or create a new storyboard",
                )
            
            # Perform validation
            issues = []
            
            # Check if storyboard has shots
            if not storyboard.shots:
                issues.append(StoryboardValidationIssue(
                    severity="error",
                    category="structure",
                    message="Storyboard has no shots",
                    suggestion="Add shots using storycore.storyboard.shot.add",
                ))
            
            # Check shot sequence numbers
            expected_sequence = list(range(len(storyboard.shots)))
            actual_sequence = [shot.sequence_number for shot in storyboard.shots]
            if actual_sequence != expected_sequence:
                issues.append(StoryboardValidationIssue(
                    severity="warning",
                    category="sequence",
                    message="Shot sequence numbers are not consecutive",
                    suggestion="Use storycore.storyboard.shot.reorder to fix sequence",
                ))
            
            # Check for shots with zero or negative duration
            for shot in storyboard.shots:
                if shot.duration_seconds <= 0:
                    issues.append(StoryboardValidationIssue(
                        severity="error",
                        category="duration",
                        message=f"Shot '{shot.shot_id}' has invalid duration: {shot.duration_seconds}",
                        shot_id=shot.shot_id,
                        suggestion="Update shot duration to a positive value",
                    ))
            
            # Check for missing descriptions
            for shot in storyboard.shots:
                if not shot.description or shot.description.strip() == "":
                    issues.append(StoryboardValidationIssue(
                        severity="warning",
                        category="content",
                        message=f"Shot '{shot.shot_id}' has no description",
                        shot_id=shot.shot_id,
                        suggestion="Add a description to the shot",
                    ))
            
            # Check total duration consistency
            calculated_duration = sum(shot.duration_seconds for shot in storyboard.shots)
            if abs(calculated_duration - storyboard.total_duration_seconds) > 0.01:
                issues.append(StoryboardValidationIssue(
                    severity="warning",
                    category="duration",
                    message=f"Total duration mismatch: stored={storyboard.total_duration_seconds}, calculated={calculated_duration}",
                    suggestion="Recalculate total duration",
                ))
            
            # Count issues by severity
            errors = sum(1 for issue in issues if issue.severity == "error")
            warnings = sum(1 for issue in issues if issue.severity == "warning")
            info = sum(1 for issue in issues if issue.severity == "info")
            
            # Determine if valid (no errors)
            valid = errors == 0
            
            response_data = {
                "storyboard_id": storyboard_id,
                "valid": valid,
                "issues": [
                    {
                        "severity": issue.severity,
                        "category": issue.category,
                        "message": issue.message,
                        "shot_id": issue.shot_id,
                        "suggestion": issue.suggestion,
                    }
                    for issue in issues
                ],
                "total_issues": len(issues),
                "errors": errors,
                "warnings": warnings,
                "info": info,
                "validated_at": datetime.now().isoformat(),
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.storyboard.validate", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def export(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Export storyboard in specified format.
        
        Endpoint: storycore.storyboard.export
        Requirements: 9.7
        """
        self.log_request("storycore.storyboard.export", params, context)
        
        try:
            # Validate required parameters
            error_response = self.validate_required_params(
                params, ["storyboard_id", "format"], context
            )
            if error_response:
                return error_response
            
            storyboard_id = params["storyboard_id"]
            export_format = params["format"]
            include_images = params.get("include_images", False)
            output_path = params.get("output_path")
            metadata = params.get("metadata", {})
            base_path = params.get("base_path", ".")
            
            # Validate format
            valid_formats = ["json", "pdf", "html", "csv"]
            if export_format not in valid_formats:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid export format: {export_format}",
                    context=context,
                    details={"format": export_format, "valid_formats": valid_formats},
                    remediation=f"Use one of: {', '.join(valid_formats)}",
                )
            
            # Get storyboard
            storyboard = self._get_storyboard(storyboard_id)
            if not storyboard:
                # Try loading from disk
                project_name = params.get("project_name")
                if project_name:
                    storyboard = self._load_storyboard_from_disk(project_name, base_path)
                    if storyboard:
                        self.storyboards[storyboard.storyboard_id] = storyboard
                        storyboard_id = storyboard.storyboard_id
            
            if not storyboard:
                return self.create_error_response(
                    error_code=ErrorCodes.NOT_FOUND,
                    message=f"Storyboard '{storyboard_id}' not found",
                    context=context,
                    remediation="Check the storyboard ID",
                )
            
            # Generate output path if not provided
            if not output_path:
                project_path = Path(base_path) / storyboard.project_name
                exports_dir = project_path / "exports"
                exports_dir.mkdir(exist_ok=True)
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_path = str(exports_dir / f"storyboard_{timestamp}.{export_format}")
            
            # Export based on format
            if export_format == "json":
                file_size = self._export_json(storyboard, output_path)
            elif export_format == "html":
                file_size = self._export_html(storyboard, output_path, include_images)
            elif export_format == "csv":
                file_size = self._export_csv(storyboard, output_path)
            elif export_format == "pdf":
                file_size = self._export_pdf(storyboard, output_path, include_images)
            else:
                file_size = 0
            
            response_data = {
                "storyboard_id": storyboard_id,
                "format": export_format,
                "output_path": output_path,
                "file_size_bytes": file_size,
                "exported_at": datetime.now().isoformat(),
                "metadata": metadata,
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.storyboard.export", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def _export_json(self, storyboard: Storyboard, output_path: str) -> int:
        """Export storyboard as JSON."""
        data = {
            "storyboard_id": storyboard.storyboard_id,
            "project_name": storyboard.project_name,
            "title": storyboard.title,
            "description": storyboard.description,
            "total_duration_seconds": storyboard.total_duration_seconds,
            "total_shots": len(storyboard.shots),
            "created_at": storyboard.created_at.isoformat() if storyboard.created_at else None,
            "updated_at": storyboard.updated_at.isoformat() if storyboard.updated_at else None,
            "shots": [
                {
                    "shot_id": shot.shot_id,
                    "sequence_number": shot.sequence_number,
                    "description": shot.description,
                    "duration_seconds": shot.duration_seconds,
                    "camera_angle": shot.camera_angle,
                    "camera_movement": shot.camera_movement,
                    "composition": shot.composition,
                    "lighting": shot.lighting,
                    "visual_notes": shot.visual_notes,
                    "audio_notes": shot.audio_notes,
                    "image_path": shot.image_path,
                    "metadata": shot.metadata,
                }
                for shot in storyboard.shots
            ],
            "metadata": storyboard.metadata,
        }
        
        with open(output_path, "w") as f:
            json.dump(data, f, indent=2)
        
        return Path(output_path).stat().st_size
    
    def _export_html(self, storyboard: Storyboard, output_path: str, include_images: bool) -> int:
        """Export storyboard as HTML."""
        html = f"""<!DOCTYPE html>
<html>
<head>
    <title>{storyboard.title}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        h1 {{ color: #333; }}
        .shot {{ border: 1px solid #ddd; padding: 15px; margin: 10px 0; }}
        .shot-header {{ font-weight: bold; color: #0066cc; }}
        .shot-details {{ margin-top: 10px; }}
    </style>
</head>
<body>
    <h1>{storyboard.title}</h1>
    <p><strong>Project:</strong> {storyboard.project_name}</p>
    <p><strong>Total Shots:</strong> {len(storyboard.shots)}</p>
    <p><strong>Total Duration:</strong> {storyboard.total_duration_seconds:.1f}s</p>
    <hr>
"""
        
        for shot in storyboard.shots:
            html += f"""
    <div class="shot">
        <div class="shot-header">Shot {shot.sequence_number + 1}: {shot.shot_id}</div>
        <div class="shot-details">
            <p><strong>Description:</strong> {shot.description}</p>
            <p><strong>Duration:</strong> {shot.duration_seconds}s</p>
            <p><strong>Camera:</strong> {shot.camera_angle or 'N/A'} / {shot.camera_movement or 'N/A'}</p>
            <p><strong>Composition:</strong> {shot.composition or 'N/A'}</p>
        </div>
    </div>
"""
        
        html += """
</body>
</html>
"""
        
        with open(output_path, "w") as f:
            f.write(html)
        
        return Path(output_path).stat().st_size
    
    def _export_csv(self, storyboard: Storyboard, output_path: str) -> int:
        """Export storyboard as CSV."""
        import csv
        
        with open(output_path, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "Shot ID", "Sequence", "Description", "Duration (s)",
                "Camera Angle", "Camera Movement", "Composition", "Lighting"
            ])
            
            for shot in storyboard.shots:
                writer.writerow([
                    shot.shot_id,
                    shot.sequence_number,
                    shot.description,
                    shot.duration_seconds,
                    shot.camera_angle or "",
                    shot.camera_movement or "",
                    shot.composition or "",
                    shot.lighting or "",
                ])
        
        return Path(output_path).stat().st_size
    
    def _export_pdf(self, storyboard: Storyboard, output_path: str, include_images: bool) -> int:
        """Export storyboard as PDF (mock implementation)."""
        # In a real implementation, this would use a PDF library like reportlab
        # For now, we'll create a text file with .pdf extension
        content = f"Storyboard: {storyboard.title}\n"
        content += f"Project: {storyboard.project_name}\n"
        content += f"Total Shots: {len(storyboard.shots)}\n"
        content += f"Total Duration: {storyboard.total_duration_seconds:.1f}s\n\n"
        
        for shot in storyboard.shots:
            content += f"Shot {shot.sequence_number + 1}: {shot.shot_id}\n"
            content += f"  Description: {shot.description}\n"
            content += f"  Duration: {shot.duration_seconds}s\n"
            content += f"  Camera: {shot.camera_angle or 'N/A'} / {shot.camera_movement or 'N/A'}\n\n"
        
        with open(output_path, "w") as f:
            f.write(content)
        
        return Path(output_path).stat().st_size
    
    # Shot management endpoints
    
    def shot_add(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Add shot to storyboard.
        
        Endpoint: storycore.storyboard.shot.add
        Requirements: 9.2
        """
        self.log_request("storycore.storyboard.shot.add", params, context)
        
        try:
            # Validate required parameters
            error_response = self.validate_required_params(
                params, ["storyboard_id", "description", "duration_seconds"], context
            )
            if error_response:
                return error_response
            
            storyboard_id = params["storyboard_id"]
            description = params["description"]
            duration_seconds = params["duration_seconds"]
            camera_angle = params.get("camera_angle")
            camera_movement = params.get("camera_movement")
            composition = params.get("composition")
            lighting = params.get("lighting")
            visual_notes = params.get("visual_notes")
            audio_notes = params.get("audio_notes")
            insert_at = params.get("insert_at")
            metadata = params.get("metadata", {})
            base_path = params.get("base_path", ".")
            
            # Validate duration
            if duration_seconds <= 0:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Duration must be positive, got: {duration_seconds}",
                    context=context,
                    remediation="Provide a positive duration value",
                )
            
            # Get storyboard
            storyboard = self._get_storyboard(storyboard_id)
            if not storyboard:
                return self.create_error_response(
                    error_code=ErrorCodes.NOT_FOUND,
                    message=f"Storyboard '{storyboard_id}' not found",
                    context=context,
                    remediation="Check the storyboard ID or create a new storyboard",
                )
            
            # Generate shot ID
            shot_id = f"shot_{len(storyboard.shots) + 1:03d}"
            
            # Create shot
            now = datetime.now()
            shot = Shot(
                shot_id=shot_id,
                description=description,
                duration_seconds=duration_seconds,
                camera_angle=camera_angle,
                camera_movement=camera_movement,
                composition=composition,
                lighting=lighting,
                visual_notes=visual_notes,
                audio_notes=audio_notes,
                sequence_number=0,  # Will be set below
                metadata=metadata,
                created_at=now,
                updated_at=now,
            )
            
            # Insert shot at specified position or append
            if insert_at is not None and 0 <= insert_at <= len(storyboard.shots):
                storyboard.shots.insert(insert_at, shot)
            else:
                storyboard.shots.append(shot)
            
            # Recalculate sequence numbers and total duration
            self._recalculate_sequence_numbers(storyboard)
            self._recalculate_total_duration(storyboard)
            storyboard.updated_at = now
            
            # Save to disk
            self._save_storyboard_to_disk(storyboard, base_path)
            
            response_data = {
                "shot_id": shot.shot_id,
                "storyboard_id": storyboard_id,
                "sequence_number": shot.sequence_number,
                "total_shots": len(storyboard.shots),
                "created_at": shot.created_at.isoformat(),
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.storyboard.shot.add", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def shot_update(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Update existing shot.
        
        Endpoint: storycore.storyboard.shot.update
        Requirements: 9.3
        """
        self.log_request("storycore.storyboard.shot.update", params, context)
        
        try:
            # Validate required parameters
            error_response = self.validate_required_params(
                params, ["storyboard_id", "shot_id"], context
            )
            if error_response:
                return error_response
            
            storyboard_id = params["storyboard_id"]
            shot_id = params["shot_id"]
            base_path = params.get("base_path", ".")
            
            # Get storyboard
            storyboard = self._get_storyboard(storyboard_id)
            if not storyboard:
                return self.create_error_response(
                    error_code=ErrorCodes.NOT_FOUND,
                    message=f"Storyboard '{storyboard_id}' not found",
                    context=context,
                    remediation="Check the storyboard ID",
                )
            
            # Find shot
            shot = None
            for s in storyboard.shots:
                if s.shot_id == shot_id:
                    shot = s
                    break
            
            if not shot:
                return self.create_error_response(
                    error_code=ErrorCodes.NOT_FOUND,
                    message=f"Shot '{shot_id}' not found in storyboard",
                    context=context,
                    remediation="Check the shot ID or list available shots",
                )
            
            # Update fields
            updated_fields = []
            now = datetime.now()
            
            if "description" in params:
                shot.description = params["description"]
                updated_fields.append("description")
            
            if "duration_seconds" in params:
                duration = params["duration_seconds"]
                if duration <= 0:
                    return self.create_error_response(
                        error_code=ErrorCodes.VALIDATION_ERROR,
                        message=f"Duration must be positive, got: {duration}",
                        context=context,
                        remediation="Provide a positive duration value",
                    )
                shot.duration_seconds = duration
                updated_fields.append("duration_seconds")
            
            if "camera_angle" in params:
                shot.camera_angle = params["camera_angle"]
                updated_fields.append("camera_angle")
            
            if "camera_movement" in params:
                shot.camera_movement = params["camera_movement"]
                updated_fields.append("camera_movement")
            
            if "composition" in params:
                shot.composition = params["composition"]
                updated_fields.append("composition")
            
            if "lighting" in params:
                shot.lighting = params["lighting"]
                updated_fields.append("lighting")
            
            if "visual_notes" in params:
                shot.visual_notes = params["visual_notes"]
                updated_fields.append("visual_notes")
            
            if "audio_notes" in params:
                shot.audio_notes = params["audio_notes"]
                updated_fields.append("audio_notes")
            
            if "metadata" in params:
                shot.metadata.update(params["metadata"])
                updated_fields.append("metadata")
            
            shot.updated_at = now
            storyboard.updated_at = now
            
            # Recalculate total duration if duration changed
            if "duration_seconds" in updated_fields:
                self._recalculate_total_duration(storyboard)
            
            # Save to disk
            self._save_storyboard_to_disk(storyboard, base_path)
            
            response_data = {
                "shot_id": shot.shot_id,
                "storyboard_id": storyboard_id,
                "updated_fields": updated_fields,
                "updated_at": shot.updated_at.isoformat(),
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.storyboard.shot.update", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def shot_delete(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Delete shot from storyboard.
        
        Endpoint: storycore.storyboard.shot.delete
        Requirements: 9.4
        """
        self.log_request("storycore.storyboard.shot.delete", params, context)
        
        try:
            # Validate required parameters
            error_response = self.validate_required_params(
                params, ["storyboard_id", "shot_id"], context
            )
            if error_response:
                return error_response
            
            storyboard_id = params["storyboard_id"]
            shot_id = params["shot_id"]
            base_path = params.get("base_path", ".")
            
            # Get storyboard
            storyboard = self._get_storyboard(storyboard_id)
            if not storyboard:
                return self.create_error_response(
                    error_code=ErrorCodes.NOT_FOUND,
                    message=f"Storyboard '{storyboard_id}' not found",
                    context=context,
                    remediation="Check the storyboard ID",
                )
            
            # Find and remove shot
            shot_index = None
            for i, shot in enumerate(storyboard.shots):
                if shot.shot_id == shot_id:
                    shot_index = i
                    break
            
            if shot_index is None:
                return self.create_error_response(
                    error_code=ErrorCodes.NOT_FOUND,
                    message=f"Shot '{shot_id}' not found in storyboard",
                    context=context,
                    remediation="Check the shot ID",
                )
            
            # Remove shot
            storyboard.shots.pop(shot_index)
            
            # Recalculate sequence numbers and total duration
            self._recalculate_sequence_numbers(storyboard)
            self._recalculate_total_duration(storyboard)
            storyboard.updated_at = datetime.now()
            
            # Save to disk
            self._save_storyboard_to_disk(storyboard, base_path)
            
            response_data = {
                "shot_id": shot_id,
                "storyboard_id": storyboard_id,
                "deleted": True,
                "remaining_shots": len(storyboard.shots),
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.storyboard.shot.delete", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def shot_reorder(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Reorder shots in sequence.
        
        Endpoint: storycore.storyboard.shot.reorder
        Requirements: 9.5
        """
        self.log_request("storycore.storyboard.shot.reorder", params, context)
        
        try:
            # Validate required parameters
            error_response = self.validate_required_params(
                params, ["storyboard_id", "shot_order"], context
            )
            if error_response:
                return error_response
            
            storyboard_id = params["storyboard_id"]
            shot_order = params["shot_order"]
            base_path = params.get("base_path", ".")
            
            # Get storyboard
            storyboard = self._get_storyboard(storyboard_id)
            if not storyboard:
                return self.create_error_response(
                    error_code=ErrorCodes.NOT_FOUND,
                    message=f"Storyboard '{storyboard_id}' not found",
                    context=context,
                    remediation="Check the storyboard ID",
                )
            
            # Validate shot_order
            if not isinstance(shot_order, list):
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message="shot_order must be a list of shot IDs",
                    context=context,
                    remediation="Provide a list of shot IDs in the desired order",
                )
            
            # Check that all shots are included
            current_shot_ids = {shot.shot_id for shot in storyboard.shots}
            provided_shot_ids = set(shot_order)
            
            if current_shot_ids != provided_shot_ids:
                missing = current_shot_ids - provided_shot_ids
                extra = provided_shot_ids - current_shot_ids
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message="shot_order must include all shots exactly once",
                    context=context,
                    details={
                        "missing_shots": list(missing),
                        "extra_shots": list(extra),
                    },
                    remediation="Ensure all shot IDs are included exactly once",
                )
            
            # Create shot lookup
            shot_lookup = {shot.shot_id: shot for shot in storyboard.shots}
            
            # Reorder shots
            new_shots = []
            for shot_id in shot_order:
                new_shots.append(shot_lookup[shot_id])
            
            storyboard.shots = new_shots
            
            # Recalculate sequence numbers
            self._recalculate_sequence_numbers(storyboard)
            storyboard.updated_at = datetime.now()
            
            # Save to disk
            self._save_storyboard_to_disk(storyboard, base_path)
            
            # Build new sequence info
            new_sequence = [
                {"shot_id": shot.shot_id, "sequence_number": shot.sequence_number}
                for shot in storyboard.shots
            ]
            
            response_data = {
                "storyboard_id": storyboard_id,
                "reordered_count": len(storyboard.shots),
                "new_sequence": new_sequence,
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.storyboard.shot.reorder", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    # Timeline endpoint
    
    def timeline_generate(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Generate timeline with durations.
        
        Endpoint: storycore.storyboard.timeline.generate
        Requirements: 9.6
        """
        self.log_request("storycore.storyboard.timeline.generate", params, context)
        
        try:
            # Validate required parameters
            error_response = self.validate_required_params(
                params, ["storyboard_id"], context
            )
            if error_response:
                return error_response
            
            storyboard_id = params["storyboard_id"]
            include_transitions = params.get("include_transitions", False)
            transition_duration_seconds = params.get("transition_duration_seconds", 0.5)
            metadata = params.get("metadata", {})
            base_path = params.get("base_path", ".")
            
            # Get storyboard
            storyboard = self._get_storyboard(storyboard_id)
            if not storyboard:
                # Try loading from disk
                project_name = params.get("project_name")
                if project_name:
                    storyboard = self._load_storyboard_from_disk(project_name, base_path)
                    if storyboard:
                        self.storyboards[storyboard.storyboard_id] = storyboard
                        storyboard_id = storyboard.storyboard_id
            
            if not storyboard:
                return self.create_error_response(
                    error_code=ErrorCodes.NOT_FOUND,
                    message=f"Storyboard '{storyboard_id}' not found",
                    context=context,
                    remediation="Check the storyboard ID",
                )
            
            # Generate timeline entries
            entries = []
            current_time = 0.0
            
            for shot in storyboard.shots:
                # Add shot entry
                entry = TimelineEntry(
                    shot_id=shot.shot_id,
                    start_time_seconds=current_time,
                    end_time_seconds=current_time + shot.duration_seconds,
                    duration_seconds=shot.duration_seconds,
                    description=shot.description,
                    sequence_number=shot.sequence_number,
                    metadata={
                        "camera_angle": shot.camera_angle,
                        "camera_movement": shot.camera_movement,
                        "composition": shot.composition,
                    }
                )
                entries.append(entry)
                current_time += shot.duration_seconds
                
                # Add transition if requested and not last shot
                if include_transitions and shot.sequence_number < len(storyboard.shots) - 1:
                    transition_entry = TimelineEntry(
                        shot_id=f"transition_{shot.sequence_number}",
                        start_time_seconds=current_time,
                        end_time_seconds=current_time + transition_duration_seconds,
                        duration_seconds=transition_duration_seconds,
                        description=f"Transition from {shot.shot_id} to next shot",
                        sequence_number=shot.sequence_number,
                        metadata={"type": "transition"}
                    )
                    entries.append(transition_entry)
                    current_time += transition_duration_seconds
            
            # Create timeline
            now = datetime.now()
            timeline = Timeline(
                storyboard_id=storyboard_id,
                project_name=storyboard.project_name,
                entries=entries,
                total_duration_seconds=current_time,
                total_shots=len(storyboard.shots),
                generated_at=now,
                metadata=metadata,
            )
            
            # Store timeline
            self.timelines[storyboard_id] = timeline
            
            # Convert to serializable format
            timeline_data = {
                "storyboard_id": timeline.storyboard_id,
                "project_name": timeline.project_name,
                "total_duration_seconds": timeline.total_duration_seconds,
                "total_shots": timeline.total_shots,
                "generated_at": timeline.generated_at.isoformat(),
                "entries": [
                    {
                        "shot_id": entry.shot_id,
                        "start_time_seconds": entry.start_time_seconds,
                        "end_time_seconds": entry.end_time_seconds,
                        "duration_seconds": entry.duration_seconds,
                        "description": entry.description,
                        "sequence_number": entry.sequence_number,
                        "metadata": entry.metadata,
                    }
                    for entry in timeline.entries
                ],
                "metadata": timeline.metadata,
            }
            
            response_data = {
                "storyboard_id": storyboard_id,
                "timeline": timeline_data,
                "generated_at": now.isoformat(),
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.storyboard.timeline.generate", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)
