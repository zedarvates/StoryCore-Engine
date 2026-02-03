"""
Pipeline Category Handler

This module implements all 12 pipeline and structure API endpoints.
"""

import logging
import json
from typing import Dict, Any, Optional
from pathlib import Path
from datetime import datetime
import uuid

from ..base_handler import BaseAPIHandler
from ..models import APIResponse, RequestContext, ErrorCodes
from ..config import APIConfig
from ..router import APIRouter

from .pipeline_models import (
    PipelineStage,
    PipelineStatus,
    ProjectInitRequest,
    ProjectInitResponse,
    ProjectValidationResult,
    PipelineExecutionRequest,
    PipelineExecutionResponse,
    PipelineStageConfig,
    PipelineCheckpoint,
    DependencyCheckResult,
    StageListResponse,
    PIPELINE_STAGES,
    PipelinePhase,
    PipelineStageStatus,
)

# Import existing project manager
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from project_manager import ProjectManager

logger = logging.getLogger(__name__)



class PipelineCategoryHandler(BaseAPIHandler):
    """
    Handler for Pipeline and Structure API category.
    
    Implements 12 endpoints for project lifecycle, pipeline execution,
    configuration, and checkpoint management.
    """
    
    def __init__(self, config: APIConfig, router: APIRouter):
        """
        Initialize pipeline handler.
        
        Args:
            config: API configuration
            router: API router for endpoint registration
        """
        super().__init__(config)
        self.router = router
        self.project_manager = ProjectManager()
        
        # Track active pipeline executions
        self.active_pipelines: Dict[str, Dict[str, Any]] = {}
        
        # Checkpoint storage
        self.checkpoints: Dict[str, PipelineCheckpoint] = {}
        
        # Register all endpoints
        self.register_endpoints()
        
        logger.info("Initialized PipelineCategoryHandler with 12 endpoints")

    
    def register_endpoints(self) -> None:
        """Register all pipeline endpoints with the router."""
        
        # Project lifecycle endpoints (3)
        self.router.register_endpoint(
            path="storycore.pipeline.init",
            method="POST",
            handler=self.init_project,
            description="Initialize a new StoryCore project",
            async_capable=False,
        )
        
        self.router.register_endpoint(
            path="storycore.pipeline.validate",
            method="POST",
            handler=self.validate_project,
            description="Validate project integrity and Data Contract compliance",
            async_capable=False,
        )
        
        self.router.register_endpoint(
            path="storycore.pipeline.status",
            method="GET",
            handler=self.get_status,
            description="Get current pipeline status",
            async_capable=False,
        )
        
        # Pipeline execution endpoints (4)
        self.router.register_endpoint(
            path="storycore.pipeline.execute",
            method="POST",
            handler=self.execute_pipeline,
            description="Execute specified pipeline stages",
            async_capable=True,
        )
        
        self.router.register_endpoint(
            path="storycore.pipeline.pause",
            method="POST",
            handler=self.pause_pipeline,
            description="Pause current pipeline execution",
            async_capable=False,
        )
        
        self.router.register_endpoint(
            path="storycore.pipeline.resume",
            method="POST",
            handler=self.resume_pipeline,
            description="Resume paused pipeline execution",
            async_capable=False,
        )
        
        self.router.register_endpoint(
            path="storycore.pipeline.cancel",
            method="POST",
            handler=self.cancel_pipeline,
            description="Cancel pipeline execution and clean up resources",
            async_capable=False,
        )
        
        # Pipeline configuration endpoints (3)
        self.router.register_endpoint(
            path="storycore.pipeline.stages.list",
            method="GET",
            handler=self.list_stages,
            description="List available pipeline stages and dependencies",
            async_capable=False,
        )
        
        self.router.register_endpoint(
            path="storycore.pipeline.stages.configure",
            method="POST",
            handler=self.configure_stage,
            description="Configure stage-specific parameters",
            async_capable=False,
        )
        
        self.router.register_endpoint(
            path="storycore.pipeline.dependencies.check",
            method="GET",
            handler=self.check_dependencies,
            description="Verify all required tools and resources are available",
            async_capable=False,
        )
        
        # Checkpoint management endpoints (2)
        self.router.register_endpoint(
            path="storycore.pipeline.checkpoint.create",
            method="POST",
            handler=self.create_checkpoint,
            description="Save current pipeline state",
            async_capable=False,
        )
        
        self.router.register_endpoint(
            path="storycore.pipeline.checkpoint.restore",
            method="POST",
            handler=self.restore_checkpoint,
            description="Restore saved pipeline state",
            async_capable=False,
        )

    
    # Project lifecycle endpoints
    
    def init_project(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Initialize a new StoryCore project.
        
        Endpoint: storycore.pipeline.init
        Requirements: 3.1
        """
        error = self.validate_required_params(params, ["project_name"], context)
        if error:
            return error
        
        try:
            project_name = params["project_name"]
            base_path = params.get("base_path", ".")
            config = params.get("config", {})
            capabilities = params.get("capabilities")
            
            # Check if project already exists
            project_path = Path(base_path) / project_name
            if project_path.exists():
                return self.create_error_response(
                    error_code=ErrorCodes.CONFLICT,
                    message=f"Project '{project_name}' already exists",
                    context=context,
                    details={"project_path": str(project_path)},
                    remediation="Choose a different project name or delete the existing project",
                )
            
            # Initialize project using project manager
            result = self.project_manager.init_project(project_name, base_path)
            
            # Check if initialization was successful
            if not result["success"]:
                error_details = {
                    "project_path": result["project_path"],
                    "errors": result["errors"],
                    "warnings": result["warnings"]
                }
                return self.create_error_response(
                    error_code=ErrorCodes.INTERNAL_ERROR,
                    message=f"Failed to initialize project '{project_name}'",
                    context=context,
                    details=error_details,
                    remediation="Check error messages for details and ensure you have write permissions",
                )
            
            # Load created project.json
            project_json_path = project_path / "project.json"
            with open(project_json_path, "r") as f:
                project_data = json.load(f)
            
            # Apply custom config if provided
            if config:
                project_data["config"].update(config)
            
            # Apply custom capabilities if provided
            if capabilities:
                project_data["capabilities"].update(capabilities)
            
            # Save updated project.json
            with open(project_json_path, "w") as f:
                json.dump(project_data, f, indent=2)
            
            # Create response
            response_data = {
                "project_name": project_name,
                "project_path": str(project_path),
                "project_id": project_data["project_id"],
                "global_seed": project_data["config"]["global_seed"],
                "created_at": project_data["created_at"],
                "capabilities": project_data["capabilities"],
                "generation_status": project_data["generation_status"],
            }
            
            return self.create_success_response(response_data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)

    
    def validate_project(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Validate project integrity and Data Contract compliance.
        
        Endpoint: storycore.pipeline.validate
        Requirements: 3.7
        """
        error = self.validate_required_params(params, ["project_name"], context)
        if error:
            return error
        
        try:
            project_name = params["project_name"]
            base_path = params.get("base_path", ".")
            
            # Check if project exists
            project_path = Path(base_path) / project_name
            if not project_path.exists():
                return self.create_error_response(
                    error_code=ErrorCodes.NOT_FOUND,
                    message=f"Project '{project_name}' not found",
                    context=context,
                    details={"project_path": str(project_path)},
                    remediation="Check the project name and path",
                )
            
            # Load project.json
            project_json_path = project_path / "project.json"
            if not project_json_path.exists():
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Project '{project_name}' is missing project.json",
                    context=context,
                    details={"project_path": str(project_path)},
                    remediation="Reinitialize the project or restore from backup",
                )
            
            with open(project_json_path, "r") as f:
                project_data = json.load(f)
            
            # Validate schema compliance
            issues = []
            warnings = []
            missing_fields = []
            invalid_fields = []
            
            # Check required fields
            required_fields = ["schema_version", "project_id", "capabilities", "generation_status"]
            for field in required_fields:
                if field not in project_data:
                    missing_fields.append(field)
                    issues.append({
                        "type": "missing_field",
                        "field": field,
                        "severity": "error",
                        "message": f"Required field '{field}' is missing",
                    })
            
            # Check schema version
            if "schema_version" in project_data:
                if project_data["schema_version"] != self.project_manager.schema_version:
                    warnings.append(f"Schema version mismatch: expected {self.project_manager.schema_version}, got {project_data['schema_version']}")
            
            # Ensure schema compliance (will add missing fields)
            compliant_data = self.project_manager.ensure_schema_compliance(project_data)
            
            # Check if any fields were added
            added_fields = set(compliant_data.keys()) - set(project_data.keys())
            if added_fields:
                warnings.append(f"Added missing fields: {', '.join(added_fields)}")
            
            # Save compliant data back
            with open(project_json_path, "w") as f:
                json.dump(compliant_data, f, indent=2)
            
            # Create validation result
            result = {
                "valid": len(issues) == 0,
                "project_name": project_name,
                "schema_version": compliant_data.get("schema_version", "unknown"),
                "issues": issues,
                "warnings": warnings,
                "data_contract_compliant": len(missing_fields) == 0 and len(invalid_fields) == 0,
                "missing_fields": missing_fields,
                "invalid_fields": invalid_fields,
            }
            
            return self.create_success_response(result, context)
            
        except Exception as e:
            return self.handle_exception(e, context)

    
    def get_status(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Get current pipeline status.
        
        Endpoint: storycore.pipeline.status
        Requirements: 3.2
        """
        error = self.validate_required_params(params, ["project_name"], context)
        if error:
            return error
        
        try:
            project_name = params["project_name"]
            base_path = params.get("base_path", ".")
            
            # Check if project exists
            project_path = Path(base_path) / project_name
            if not project_path.exists():
                return self.create_error_response(
                    error_code=ErrorCodes.NOT_FOUND,
                    message=f"Project '{project_name}' not found",
                    context=context,
                    details={"project_path": str(project_path)},
                    remediation="Check the project name and path",
                )
            
            # Load project.json
            project_json_path = project_path / "project.json"
            with open(project_json_path, "r") as f:
                project_data = json.load(f)
            
            # Determine current stage and phase
            generation_status = project_data.get("generation_status", {})
            current_phase = project_data.get("status", {}).get("current_phase", "initialization")
            
            # Calculate completed and remaining stages
            stages_completed = [stage for stage, status in generation_status.items() 
                              if status in ["done", "passed", "completed"]]
            stages_remaining = [stage for stage, status in generation_status.items() 
                              if status in ["pending", "running"]]
            
            # Determine current stage
            current_stage = "none"
            for stage, status in generation_status.items():
                if status == "running":
                    current_stage = stage
                    break
            if current_stage == "none" and stages_remaining:
                current_stage = stages_remaining[0]
            
            # Calculate progress
            total_stages = len(generation_status)
            completed_count = len(stages_completed)
            progress = completed_count / total_stages if total_stages > 0 else 0.0
            
            # Get errors and warnings
            errors = []
            warnings = []
            if "quality_validation" in project_data:
                qv = project_data["quality_validation"]
                if qv.get("detected_issues"):
                    for issue in qv["detected_issues"]:
                        if issue.get("severity") == "error":
                            errors.append(issue.get("description", "Unknown error"))
                        elif issue.get("severity") == "warning":
                            warnings.append(issue.get("description", "Unknown warning"))
            
            # Check if there's an active pipeline execution
            pipeline_info = self.active_pipelines.get(project_name, {})
            
            # Create status response
            status_data = {
                "project_name": project_name,
                "current_stage": current_stage,
                "current_phase": current_phase,
                "stages_completed": stages_completed,
                "stages_remaining": stages_remaining,
                "progress": progress,
                "errors": errors,
                "warnings": warnings,
                "started_at": pipeline_info.get("started_at"),
                "updated_at": project_data.get("updated_at"),
                "estimated_completion": pipeline_info.get("estimated_completion"),
                "is_running": pipeline_info.get("is_running", False),
                "is_paused": pipeline_info.get("is_paused", False),
            }
            
            return self.create_success_response(status_data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)

    
    # Pipeline execution endpoints
    
    def execute_pipeline(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Execute specified pipeline stages.
        
        Endpoint: storycore.pipeline.execute
        Requirements: 3.3
        """
        error = self.validate_required_params(params, ["project_name", "stages"], context)
        if error:
            return error
        
        try:
            project_name = params["project_name"]
            stages = params["stages"]
            async_mode = params.get("async_mode", True)
            continue_on_error = params.get("continue_on_error", False)
            stage_parameters = params.get("parameters", {})
            
            # Validate project exists
            base_path = params.get("base_path", ".")
            project_path = Path(base_path) / project_name
            if not project_path.exists():
                return self.create_error_response(
                    error_code=ErrorCodes.NOT_FOUND,
                    message=f"Project '{project_name}' not found",
                    context=context,
                    details={"project_path": str(project_path)},
                    remediation="Initialize the project first using storycore.pipeline.init",
                )
            
            # Validate stages
            invalid_stages = [s for s in stages if s not in PIPELINE_STAGES]
            if invalid_stages:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid stages: {', '.join(invalid_stages)}",
                    context=context,
                    details={"invalid_stages": invalid_stages},
                    remediation=f"Valid stages are: {', '.join(PIPELINE_STAGES.keys())}",
                )
            
            # Check dependencies
            for stage in stages:
                stage_def = PIPELINE_STAGES[stage]
                for dep in stage_def.dependencies:
                    if dep not in stages:
                        # Check if dependency is already completed
                        project_json_path = project_path / "project.json"
                        with open(project_json_path, "r") as f:
                            project_data = json.load(f)
                        
                        gen_status = project_data.get("generation_status", {})
                        if gen_status.get(dep) not in ["done", "passed", "completed"]:
                            return self.create_error_response(
                                error_code=ErrorCodes.VALIDATION_ERROR,
                                message=f"Stage '{stage}' requires '{dep}' to be completed first",
                                context=context,
                                details={"stage": stage, "missing_dependency": dep},
                                remediation=f"Include '{dep}' in the stages list or complete it first",
                            )
            
            # Create execution record
            execution_id = str(uuid.uuid4())
            started_at = datetime.now()
            
            self.active_pipelines[project_name] = {
                "execution_id": execution_id,
                "stages": stages,
                "current_stage_index": 0,
                "started_at": started_at.isoformat(),
                "is_running": True,
                "is_paused": False,
                "continue_on_error": continue_on_error,
                "parameters": stage_parameters,
            }
            
            # If async mode, return task ID
            if async_mode:
                response_data = {
                    "project_name": project_name,
                    "stages": stages,
                    "execution_mode": "async",
                    "task_id": execution_id,
                    "started_at": started_at.isoformat(),
                }
                return self.create_pending_response(execution_id, context, response_data)
            
            # Synchronous execution (for testing or simple cases)
            # Note: In production, this would actually execute the stages
            # For now, we'll simulate by updating the status
            response_data = {
                "project_name": project_name,
                "stages": stages,
                "execution_mode": "sync",
                "started_at": started_at.isoformat(),
                "completed_at": datetime.now().isoformat(),
                "status": "completed",
            }
            
            return self.create_success_response(response_data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)

    
    def pause_pipeline(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Pause current pipeline execution.
        
        Endpoint: storycore.pipeline.pause
        Requirements: 3.4
        """
        error = self.validate_required_params(params, ["project_name"], context)
        if error:
            return error
        
        try:
            project_name = params["project_name"]
            
            # Check if pipeline is running
            if project_name not in self.active_pipelines:
                return self.create_error_response(
                    error_code=ErrorCodes.CONFLICT,
                    message=f"No active pipeline execution for project '{project_name}'",
                    context=context,
                    details={"project_name": project_name},
                    remediation="Start a pipeline execution first using storycore.pipeline.execute",
                )
            
            pipeline_info = self.active_pipelines[project_name]
            
            if not pipeline_info.get("is_running"):
                return self.create_error_response(
                    error_code=ErrorCodes.CONFLICT,
                    message=f"Pipeline for project '{project_name}' is not running",
                    context=context,
                    details={"project_name": project_name, "is_paused": pipeline_info.get("is_paused")},
                    remediation="Pipeline is already paused or completed",
                )
            
            # Pause the pipeline
            pipeline_info["is_running"] = False
            pipeline_info["is_paused"] = True
            pipeline_info["paused_at"] = datetime.now().isoformat()
            
            response_data = {
                "project_name": project_name,
                "status": "paused",
                "paused_at": pipeline_info["paused_at"],
                "current_stage": pipeline_info["stages"][pipeline_info["current_stage_index"]],
            }
            
            return self.create_success_response(response_data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def resume_pipeline(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Resume paused pipeline execution.
        
        Endpoint: storycore.pipeline.resume
        Requirements: 3.5
        """
        error = self.validate_required_params(params, ["project_name"], context)
        if error:
            return error
        
        try:
            project_name = params["project_name"]
            
            # Check if pipeline exists
            if project_name not in self.active_pipelines:
                return self.create_error_response(
                    error_code=ErrorCodes.CONFLICT,
                    message=f"No pipeline execution found for project '{project_name}'",
                    context=context,
                    details={"project_name": project_name},
                    remediation="Start a pipeline execution first using storycore.pipeline.execute",
                )
            
            pipeline_info = self.active_pipelines[project_name]
            
            if not pipeline_info.get("is_paused"):
                return self.create_error_response(
                    error_code=ErrorCodes.CONFLICT,
                    message=f"Pipeline for project '{project_name}' is not paused",
                    context=context,
                    details={"project_name": project_name, "is_running": pipeline_info.get("is_running")},
                    remediation="Pipeline is already running or completed",
                )
            
            # Resume the pipeline
            pipeline_info["is_running"] = True
            pipeline_info["is_paused"] = False
            pipeline_info["resumed_at"] = datetime.now().isoformat()
            
            response_data = {
                "project_name": project_name,
                "status": "running",
                "resumed_at": pipeline_info["resumed_at"],
                "current_stage": pipeline_info["stages"][pipeline_info["current_stage_index"]],
                "remaining_stages": pipeline_info["stages"][pipeline_info["current_stage_index"]:],
            }
            
            return self.create_success_response(response_data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def cancel_pipeline(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Cancel pipeline execution and clean up resources.
        
        Endpoint: storycore.pipeline.cancel
        Requirements: 3.6
        """
        error = self.validate_required_params(params, ["project_name"], context)
        if error:
            return error
        
        try:
            project_name = params["project_name"]
            
            # Check if pipeline exists
            if project_name not in self.active_pipelines:
                return self.create_error_response(
                    error_code=ErrorCodes.CONFLICT,
                    message=f"No active pipeline execution for project '{project_name}'",
                    context=context,
                    details={"project_name": project_name},
                    remediation="No pipeline to cancel",
                )
            
            pipeline_info = self.active_pipelines[project_name]
            
            # Cancel the pipeline
            cancelled_at = datetime.now().isoformat()
            
            response_data = {
                "project_name": project_name,
                "status": "cancelled",
                "cancelled_at": cancelled_at,
                "stages_completed": pipeline_info["stages"][:pipeline_info["current_stage_index"]],
                "stages_cancelled": pipeline_info["stages"][pipeline_info["current_stage_index"]:],
            }
            
            # Remove from active pipelines
            del self.active_pipelines[project_name]
            
            return self.create_success_response(response_data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)

    
    # Pipeline configuration endpoints
    
    def list_stages(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        List available pipeline stages and dependencies.
        
        Endpoint: storycore.pipeline.stages.list
        Requirements: 3.8
        """
        try:
            # Convert PIPELINE_STAGES to serializable format
            stages_list = []
            for name, stage in PIPELINE_STAGES.items():
                stages_list.append({
                    "name": stage.name,
                    "description": stage.description,
                    "dependencies": stage.dependencies,
                    "estimated_duration": stage.estimated_duration,
                    "required": stage.required,
                    "async_capable": stage.async_capable,
                })
            
            # Categorize stages
            categories = {
                "initialization": ["init"],
                "generation": ["grid", "promote", "refine"],
                "quality": ["qa", "autofix"],
                "content": ["narrative", "video_plan"],
                "output": ["export"],
            }
            
            response_data = {
                "stages": stages_list,
                "total_count": len(stages_list),
                "categories": categories,
            }
            
            return self.create_success_response(response_data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def configure_stage(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Configure stage-specific parameters.
        
        Endpoint: storycore.pipeline.stages.configure
        Requirements: 3.9
        """
        error = self.validate_required_params(params, ["project_name", "stage_name"], context)
        if error:
            return error
        
        try:
            project_name = params["project_name"]
            stage_name = params["stage_name"]
            stage_config = params.get("config", {})
            
            # Validate stage exists
            if stage_name not in PIPELINE_STAGES:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid stage name: {stage_name}",
                    context=context,
                    details={"stage_name": stage_name},
                    remediation=f"Valid stages are: {', '.join(PIPELINE_STAGES.keys())}",
                )
            
            # Validate project exists
            base_path = params.get("base_path", ".")
            project_path = Path(base_path) / project_name
            if not project_path.exists():
                return self.create_error_response(
                    error_code=ErrorCodes.NOT_FOUND,
                    message=f"Project '{project_name}' not found",
                    context=context,
                    details={"project_path": str(project_path)},
                    remediation="Initialize the project first",
                )
            
            # Load project.json
            project_json_path = project_path / "project.json"
            with open(project_json_path, "r") as f:
                project_data = json.load(f)
            
            # Update stage configuration
            if "stage_configs" not in project_data:
                project_data["stage_configs"] = {}
            
            project_data["stage_configs"][stage_name] = {
                "enabled": stage_config.get("enabled", True),
                "parameters": stage_config.get("parameters", {}),
                "timeout": stage_config.get("timeout"),
                "retry_on_failure": stage_config.get("retry_on_failure", False),
                "max_retries": stage_config.get("max_retries", 0),
                "updated_at": datetime.now().isoformat(),
            }
            
            # Save updated project.json
            with open(project_json_path, "w") as f:
                json.dump(project_data, f, indent=2)
            
            response_data = {
                "project_name": project_name,
                "stage_name": stage_name,
                "config": project_data["stage_configs"][stage_name],
            }
            
            return self.create_success_response(response_data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def check_dependencies(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Verify all required tools and resources are available.
        
        Endpoint: storycore.pipeline.dependencies.check
        Requirements: 3.12
        """
        try:
            # Check for required Python packages
            available_dependencies = []
            missing_dependencies = []
            dependency_versions = {}
            warnings = []
            
            # Check PIL/Pillow
            try:
                import PIL
                available_dependencies.append("PIL")
                dependency_versions["PIL"] = PIL.__version__
            except ImportError:
                missing_dependencies.append("PIL")
            
            # Check NumPy
            try:
                import numpy
                available_dependencies.append("numpy")
                dependency_versions["numpy"] = numpy.__version__
            except ImportError:
                missing_dependencies.append("numpy")
            
            # Check pathlib (standard library)
            try:
                import pathlib
                available_dependencies.append("pathlib")
                dependency_versions["pathlib"] = "standard library"
            except ImportError:
                missing_dependencies.append("pathlib")
            
            # Check json (standard library)
            try:
                import json
                available_dependencies.append("json")
                dependency_versions["json"] = "standard library"
            except ImportError:
                missing_dependencies.append("json")
            
            # Check for optional dependencies
            optional_deps = {
                "opencv-python": "cv2",
                "requests": "requests",
                "anthropic": "anthropic",
                "openai": "openai",
            }
            
            for dep_name, import_name in optional_deps.items():
                try:
                    module = __import__(import_name)
                    available_dependencies.append(dep_name)
                    if hasattr(module, "__version__"):
                        dependency_versions[dep_name] = module.__version__
                    else:
                        dependency_versions[dep_name] = "installed"
                except ImportError:
                    warnings.append(f"Optional dependency '{dep_name}' not available")
            
            # Check file system permissions
            try:
                test_path = Path(".") / ".storycore_test"
                test_path.mkdir(exist_ok=True)
                test_path.rmdir()
                available_dependencies.append("filesystem_write")
            except Exception as e:
                missing_dependencies.append("filesystem_write")
                warnings.append(f"File system write test failed: {str(e)}")
            
            result = {
                "all_available": len(missing_dependencies) == 0,
                "missing_dependencies": missing_dependencies,
                "available_dependencies": available_dependencies,
                "dependency_versions": dependency_versions,
                "warnings": warnings,
            }
            
            return self.create_success_response(result, context)
            
        except Exception as e:
            return self.handle_exception(e, context)

    
    # Checkpoint management endpoints
    
    def create_checkpoint(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Save current pipeline state.
        
        Endpoint: storycore.pipeline.checkpoint.create
        Requirements: 3.10
        """
        error = self.validate_required_params(params, ["project_name"], context)
        if error:
            return error
        
        try:
            project_name = params["project_name"]
            description = params.get("description")
            
            # Validate project exists
            base_path = params.get("base_path", ".")
            project_path = Path(base_path) / project_name
            if not project_path.exists():
                return self.create_error_response(
                    error_code=ErrorCodes.NOT_FOUND,
                    message=f"Project '{project_name}' not found",
                    context=context,
                    details={"project_path": str(project_path)},
                    remediation="Initialize the project first",
                )
            
            # Load project.json
            project_json_path = project_path / "project.json"
            with open(project_json_path, "r") as f:
                project_data = json.load(f)
            
            # Get current pipeline state
            generation_status = project_data.get("generation_status", {})
            current_phase = project_data.get("status", {}).get("current_phase", "initialization")
            
            stages_completed = [stage for stage, status in generation_status.items() 
                              if status in ["done", "passed", "completed"]]
            
            # Determine current stage
            current_stage = "none"
            for stage, status in generation_status.items():
                if status == "running":
                    current_stage = stage
                    break
            
            # Create checkpoint
            checkpoint_id = f"checkpoint_{project_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            checkpoint = {
                "checkpoint_id": checkpoint_id,
                "project_name": project_name,
                "created_at": datetime.now().isoformat(),
                "current_stage": current_stage,
                "current_phase": current_phase,
                "stages_completed": stages_completed,
                "project_state": project_data,
                "description": description,
            }
            
            # Save checkpoint
            self.checkpoints[checkpoint_id] = checkpoint
            
            # Also save to file
            checkpoint_dir = project_path / "checkpoints"
            checkpoint_dir.mkdir(exist_ok=True)
            checkpoint_file = checkpoint_dir / f"{checkpoint_id}.json"
            with open(checkpoint_file, "w") as f:
                json.dump(checkpoint, f, indent=2)
            
            response_data = {
                "checkpoint_id": checkpoint_id,
                "project_name": project_name,
                "created_at": checkpoint["created_at"],
                "current_stage": current_stage,
                "current_phase": current_phase,
                "stages_completed": stages_completed,
                "checkpoint_file": str(checkpoint_file),
            }
            
            return self.create_success_response(response_data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def restore_checkpoint(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Restore saved pipeline state.
        
        Endpoint: storycore.pipeline.checkpoint.restore
        Requirements: 3.11
        """
        error = self.validate_required_params(params, ["project_name", "checkpoint_id"], context)
        if error:
            return error
        
        try:
            project_name = params["project_name"]
            checkpoint_id = params["checkpoint_id"]
            
            # Validate project exists
            base_path = params.get("base_path", ".")
            project_path = Path(base_path) / project_name
            if not project_path.exists():
                return self.create_error_response(
                    error_code=ErrorCodes.NOT_FOUND,
                    message=f"Project '{project_name}' not found",
                    context=context,
                    details={"project_path": str(project_path)},
                    remediation="Initialize the project first",
                )
            
            # Try to load checkpoint from memory first
            checkpoint = self.checkpoints.get(checkpoint_id)
            
            # If not in memory, try to load from file
            if not checkpoint:
                checkpoint_file = project_path / "checkpoints" / f"{checkpoint_id}.json"
                if not checkpoint_file.exists():
                    return self.create_error_response(
                        error_code=ErrorCodes.NOT_FOUND,
                        message=f"Checkpoint '{checkpoint_id}' not found",
                        context=context,
                        details={"checkpoint_id": checkpoint_id},
                        remediation="Check the checkpoint ID or create a new checkpoint",
                    )
                
                with open(checkpoint_file, "r") as f:
                    checkpoint = json.load(f)
            
            # Verify checkpoint belongs to this project
            if checkpoint["project_name"] != project_name:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Checkpoint '{checkpoint_id}' belongs to project '{checkpoint['project_name']}', not '{project_name}'",
                    context=context,
                    details={"checkpoint_project": checkpoint["project_name"], "requested_project": project_name},
                    remediation="Use the correct project name or checkpoint ID",
                )
            
            # Restore project state
            project_json_path = project_path / "project.json"
            with open(project_json_path, "w") as f:
                json.dump(checkpoint["project_state"], f, indent=2)
            
            response_data = {
                "checkpoint_id": checkpoint_id,
                "project_name": project_name,
                "restored_at": datetime.now().isoformat(),
                "checkpoint_created_at": checkpoint["created_at"],
                "restored_stage": checkpoint["current_stage"],
                "restored_phase": checkpoint["current_phase"],
                "stages_completed": checkpoint["stages_completed"],
            }
            
            return self.create_success_response(response_data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
