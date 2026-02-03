"""
StoryCore-Engine Feedback Proxy Service

This FastAPI application provides a secure backend proxy for submitting feedback
to GitHub. It handles:
- Report payload validation
- GitHub issue creation via REST API
- Rate limiting and security measures
- CORS configuration for Creative Studio UI

Requirements: 5.1 - Backend Proxy Service
"""

import os
import logging
import json
from typing import Dict, Any, Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
from pydantic_settings import BaseSettings
import uvicorn

# Import JSON schema validator
from backend.payload_validator import (
    validate_payload,
    validate_payload_detailed,
    validate_schema_version,
    get_supported_schema_versions,
    migrate_payload_to_current_version
)
# Import payload size validator
from backend.payload_size_validator import (
    validate_payload_size,
    validate_raw_request_size,
    validate_screenshot_size,
    get_payload_size_breakdown
)
# Import GitHub API integration
from backend.github_api import create_github_issue, GitHubAPIError
# Import rate limiter
from backend.rate_limiter import initialize_rate_limiter, get_rate_limiter
# Import error logger
from src.feedback_error_logger import (
    log_error,
    log_validation_error,
    log_network_error,
    log_github_api_error
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    
    Environment Variables:
        GITHUB_API_TOKEN: GitHub personal access token for API authentication
        CORS_ORIGINS: Comma-separated list of allowed CORS origins
        RATE_LIMIT_THRESHOLD: Maximum requests per IP per hour (default: 10)
        MAX_PAYLOAD_SIZE_MB: Maximum payload size in MB (default: 10)
    """
    github_api_token: str = Field(..., env='GITHUB_API_TOKEN')
    cors_origins: str = Field(
        default="http://localhost:3000,http://localhost:5173",
        env='CORS_ORIGINS'
    )
    rate_limit_threshold: int = Field(default=10, env='RATE_LIMIT_THRESHOLD')
    max_payload_size_mb: int = Field(default=10, env='MAX_PAYLOAD_SIZE_MB')
    github_repo_owner: str = Field(default="zedarvates", env='GITHUB_REPO_OWNER')
    github_repo_name: str = Field(default="StoryCore-Engine", env='GITHUB_REPO_NAME')
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Initialize settings
try:
    settings = Settings()
    logger.info("Settings loaded successfully")
except Exception as e:
    logger.error(f"Failed to load settings: {e}")
    logger.warning("Using default settings - GitHub API token must be set via environment variable")
    # Create settings with minimal defaults for development
    settings = Settings(github_api_token="PLACEHOLDER_TOKEN")


# Initialize FastAPI application
app = FastAPI(
    title="StoryCore-Engine Feedback Proxy",
    description="Secure backend service for submitting feedback to GitHub",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)


# Configure CORS
origins = [origin.strip() for origin in settings.cors_origins.split(',')]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)
logger.info(f"CORS configured for origins: {origins}")


# Initialize rate limiter
# Requirements: 5.5
# Note: This will be re-initialized in tests with different settings
rate_limiter = initialize_rate_limiter(
    max_requests=settings.rate_limit_threshold,
    time_window_seconds=3600  # 1 hour
)
logger.info(f"Rate limiter initialized: {settings.rate_limit_threshold} requests per hour")


# Pydantic models for request/response validation
class SystemInfo(BaseModel):
    """System information from the client"""
    storycore_version: str
    python_version: str
    os_platform: str
    os_version: Optional[str] = None
    language: Optional[str] = None


class ModuleContext(BaseModel):
    """Active module context"""
    active_module: Optional[str] = None
    module_state: Optional[Dict[str, Any]] = None


class UserInput(BaseModel):
    """User-provided feedback content"""
    description: str = Field(..., min_length=10)
    reproduction_steps: Optional[str] = None


class Diagnostics(BaseModel):
    """Diagnostic information"""
    stacktrace: Optional[str] = None
    logs: Optional[list[str]] = None
    memory_usage_mb: Optional[float] = None
    process_state: Optional[Dict[str, Any]] = None


class ReportPayload(BaseModel):
    """
    Complete report payload from the client.
    
    This matches the Data Contract v1 structure defined in the design document.
    """
    schema_version: str = Field(default="1.0")
    report_type: str = Field(..., pattern="^(bug|enhancement|question)$")
    timestamp: str
    system_info: SystemInfo
    module_context: Optional[ModuleContext] = None
    user_input: UserInput
    diagnostics: Optional[Diagnostics] = None
    screenshot_base64: Optional[str] = None
    
    @validator('schema_version')
    def validate_schema_version(cls, v):
        # Allow missing or old versions - they will be migrated by the backend
        # This validator just ensures it's a string if present
        if v is None:
            return "1.0"  # Default to current version
        if not isinstance(v, str):
            raise ValueError("schema_version must be a string")
        # Don't enforce version here - let the migration logic handle it
        return v


class ReportResponse(BaseModel):
    """Response for successful report submission"""
    status: str
    issue_url: str
    issue_number: int


class ErrorResponse(BaseModel):
    """Response for failed report submission"""
    status: str
    message: str
    fallback_mode: str = "manual"


# Health check endpoint
@app.get("/health")
async def health_check():
    """
    Health check endpoint to verify service is running.
    
    Returns:
        dict: Status information
    """
    return {
        "status": "healthy",
        "service": "StoryCore-Engine Feedback Proxy",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


# Rate limiter stats endpoint
@app.get("/api/v1/rate-limit-stats")
async def rate_limit_stats():
    """
    Get rate limiter statistics for monitoring.
    
    This endpoint provides information about:
    - Number of IPs currently being tracked
    - Rate limit configuration
    - Request counts per IP
    
    Returns:
        dict: Rate limiter statistics
    
    Requirements: 5.5
    """
    limiter = get_rate_limiter()
    stats = limiter.get_stats()
    return {
        "status": "success",
        "stats": stats,
        "timestamp": datetime.utcnow().isoformat()
    }


# Main report submission endpoint
@app.post(
    "/api/v1/report",
    response_model=ReportResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid payload"},
        413: {"model": ErrorResponse, "description": "Payload too large"},
        429: {"model": ErrorResponse, "description": "Rate limit exceeded"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def submit_report(
    request: Request
) -> ReportResponse:
    """
    Submit a feedback report and create a GitHub issue.
    
    This endpoint:
    1. Validates the report payload (handled by Pydantic)
    2. Performs comprehensive payload size validation
    3. Validates screenshot size independently
    4. Checks and migrates schema version if needed
    5. Performs additional JSON schema validation
    6. Logs the submission details
    7. Creates a GitHub issue (mocked until task 15.1)
    8. Returns the issue URL
    
    Args:
        request: FastAPI request object for accessing client info and raw body
    
    Returns:
        ReportResponse: Success response with issue URL and issue number
    
    Raises:
        HTTPException: For validation errors, size limits, or processing failures
    
    Requirements: 5.1, 5.2, 7.2, 9.5
    """
    client_ip = request.client.host if request.client else "unknown"
    
    try:
        # 0. Parse raw JSON body first (before Pydantic validation)
        # This allows us to migrate old schema versions before strict validation
        try:
            raw_body = await request.body()
            payload_dict = json.loads(raw_body)
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in request body: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid JSON: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Failed to read request body: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to read request body: {str(e)}"
            )
        
        logger.info(f"Received report submission from {client_ip}: {payload_dict.get('report_type', 'unknown')}")
        
        # 1. Check rate limit
        # Requirements: 5.5
        limiter = get_rate_limiter()
        is_allowed, retry_after = limiter.check_rate_limit(client_ip)
        
        if not is_allowed:
            logger.warning(
                f"Rate limit exceeded for IP {client_ip}. "
                f"Retry after {retry_after} seconds"
            )
            # Return JSONResponse directly to include Retry-After header
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "status": "error",
                    "message": f"Rate limit exceeded. Too many requests from your IP address. "
                               f"Please try again in {retry_after} seconds.",
                    "fallback_mode": "manual"
                },
                headers={"Retry-After": str(retry_after)}
            )
        
        # 2. Early size check using Content-Length header (if available)
        # This allows us to reject oversized requests before parsing
        # Requirements: 7.2, 8.3
        content_length = request.headers.get('content-length')
        if content_length:
            try:
                content_length_int = int(content_length)
                is_valid_size, size_error = validate_raw_request_size(content_length_int)
                if not is_valid_size:
                    logger.warning(f"Request size validation failed: {size_error}")
                    log_validation_error(
                        field="content_length",
                        value=content_length_int,
                        reason=size_error,
                        context={"client_ip": client_ip}
                    )
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=size_error
                    )
            except ValueError as e:
                logger.warning(f"Invalid Content-Length header: {content_length}")
                log_validation_error(
                    field="content_length",
                    value=content_length,
                    reason="Invalid integer value",
                    context={"client_ip": client_ip}
                )
        
        # 3. Check and migrate schema version if needed (BEFORE Pydantic validation)
        # Requirements: 9.5 (Backward Compatibility)
        schema_version = payload_dict.get("schema_version", "unknown")
        logger.info(f"Payload schema version: {schema_version}")
        
        # Always attempt migration to ensure all required fields are present
        # This handles:
        # - Missing schema_version (Phase 1 payloads)
        # - Old schema versions (0.9, etc.)
        # - Current version (1.0) with missing optional fields
        try:
            migrated_payload, migration_notes = migrate_payload_to_current_version(payload_dict)
            
            # Log migration details if any changes were made
            if migration_notes and not any("already at current version" in note.lower() for note in migration_notes):
                logger.info(f"Migrated payload: {len(migration_notes)} changes")
                for note in migration_notes:
                    logger.info(f"  - {note}")
            
            # Update payload_dict with migrated version
            payload_dict = migrated_payload
            schema_version = payload_dict.get("schema_version", "1.0")
            
        except Exception as e:
            logger.error(f"Failed to migrate payload: {e}")
            log_validation_error(
                field="schema_version",
                value=schema_version,
                reason=f"Migration failed: {str(e)}",
                context={"client_ip": client_ip}
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to process payload: {str(e)}"
            )
        
        # Validate the final schema version
        is_valid_version, version_message = validate_schema_version(payload_dict)
        
        if not is_valid_version:
            # After migration, if still invalid, reject
            supported_versions = get_supported_schema_versions()
            logger.warning(f"Unsupported schema version after migration: {schema_version}")
            log_validation_error(
                field="schema_version",
                value=schema_version,
                reason=version_message,
                context={
                    "client_ip": client_ip,
                    "supported_versions": supported_versions
                }
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{version_message}. Supported versions: {', '.join(supported_versions)}"
            )
        else:
            logger.info(f"Schema version validation passed: {version_message}")
        
        # 4. Now validate with Pydantic (after migration)
        try:
            payload = ReportPayload(**payload_dict)
        except Exception as e:
            logger.error(f"Pydantic validation failed: {e}")
            log_validation_error(
                field="payload",
                value="request_data",
                reason=str(e),
                context={"client_ip": client_ip}
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Validation error: {str(e)}"
            )
        
        # 5. Comprehensive payload size validation
        # This calculates the actual JSON serialized size and validates:
        # - Total payload size (max 10MB)
        # - Proper handling of base64-encoded screenshots
        # - Detailed size breakdown for debugging
        # Requirements: 7.2, 8.3
        is_valid_size, size_error, size_breakdown = validate_payload_size(payload_dict)
        
        if not is_valid_size:
            logger.warning(f"Payload size validation failed: {size_error}")
            logger.info(f"Size breakdown: {size_breakdown}")
            log_validation_error(
                field="payload_size",
                value=size_breakdown.get('total_mb', 0),
                reason=size_error,
                context={"client_ip": client_ip, "size_breakdown": size_breakdown}
            )
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=size_error
            )
        
        logger.info(f"Payload size validation passed: {size_breakdown['total_mb']:.2f} MB")
        
        # 6. Check and migrate schema version if needed
        # Requirements: 9.5 (Backward Compatibility)
        schema_version = payload_dict.get("schema_version", "unknown")
        logger.info(f"Payload schema version: {schema_version}")
        
        # Validate schema version
        is_valid_version, version_message = validate_schema_version(payload_dict)
        
        if not is_valid_version:
            # Check if this is a missing schema_version (Phase 1 payload)
            if "schema_version" not in payload_dict:
                logger.info("Schema version missing - attempting migration from Phase 1")
                
                # Attempt to migrate the payload
                try:
                    migrated_payload, migration_notes = migrate_payload_to_current_version(payload_dict)
                    
                    # Log migration details
                    logger.info(f"Successfully migrated payload: {migration_notes}")
                    for note in migration_notes:
                        logger.info(f"  - {note}")
                    
                    # Update payload_dict with migrated version
                    payload_dict = migrated_payload
                    
                    # Re-create Pydantic model with migrated payload
                    try:
                        payload = ReportPayload(**payload_dict)
                        logger.info("Migrated payload validated successfully")
                    except Exception as e:
                        logger.error(f"Migrated payload failed Pydantic validation: {e}")
                        log_validation_error(
                            field="migrated_payload",
                            value="payload_dict",
                            reason=f"Migration succeeded but validation failed: {str(e)}",
                            context={"client_ip": client_ip, "migration_notes": migration_notes}
                        )
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Payload migration failed validation: {str(e)}"
                        )
                
                except Exception as e:
                    logger.error(f"Failed to migrate payload: {e}")
                    log_validation_error(
                        field="schema_version",
                        value=schema_version,
                        reason=f"Migration failed: {str(e)}",
                        context={"client_ip": client_ip}
                    )
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Failed to migrate payload from older version: {str(e)}"
                    )
            else:
                # Unsupported schema version
                supported_versions = get_supported_schema_versions()
                logger.warning(f"Unsupported schema version: {schema_version}")
                log_validation_error(
                    field="schema_version",
                    value=schema_version,
                    reason=version_message,
                    context={
                        "client_ip": client_ip,
                        "supported_versions": supported_versions
                    }
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"{version_message}. Supported versions: {', '.join(supported_versions)}"
                )
        else:
            logger.info(f"Schema version validation passed: {version_message}")
        
        # 7. Validate screenshot size independently (max 5MB decoded)
        # Requirements: 3.5, 8.3
        if payload.screenshot_base64:
            is_valid_screenshot, screenshot_error = validate_screenshot_size(payload.screenshot_base64)
            if not is_valid_screenshot:
                logger.warning(f"Screenshot size validation failed: {screenshot_error}")
                log_validation_error(
                    field="screenshot",
                    value="base64_data",
                    reason=screenshot_error,
                    context={"client_ip": client_ip}
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=screenshot_error
                )
            logger.info("Screenshot size validation passed")
        
        # 8. Additional JSON schema validation for comprehensive checks
        # This goes beyond Pydantic's basic validation to enforce:
        # - String length constraints (min/max)
        # - Pattern matching (e.g., Python version format)
        # - Array size limits
        # - No additional properties
        # Requirements: 5.2, 8.3
        is_valid, validation_errors = validate_payload(payload_dict)
        
        if not is_valid:
            logger.warning(f"JSON schema validation failed: {validation_errors}")
            error_message = "Payload validation failed: " + "; ".join(validation_errors)
            log_validation_error(
                field="payload_schema",
                value="payload_dict",
                reason=error_message,
                context={"client_ip": client_ip, "errors": validation_errors}
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_message
            )
        
        logger.info("JSON schema validation passed")
        
        # 9. Log submission details for monitoring and debugging
        module_name = payload.module_context.active_module if payload.module_context else "unknown"
        logger.info(f"Processing {payload.report_type} report:")
        logger.info(f"  - Module: {module_name}")
        logger.info(f"  - OS: {payload.system_info.os_platform}")
        logger.info(f"  - StoryCore Version: {payload.system_info.storycore_version}")
        logger.info(f"  - Schema Version: {payload.schema_version}")
        logger.info(f"  - Has stacktrace: {payload.diagnostics.stacktrace is not None if payload.diagnostics else False}")
        logger.info(f"  - Has logs: {len(payload.diagnostics.logs) if payload.diagnostics and payload.diagnostics.logs else 0} lines")
        logger.info(f"  - Has screenshot: {payload.screenshot_base64 is not None}")
        logger.info(f"  - Payload size: {size_breakdown['total_mb']:.2f} MB")
        
        # 10. Validate required fields are present
        if not payload.user_input.description:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Description is required"
            )
        
        if len(payload.user_input.description) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Description must be at least 10 characters long"
            )
        
        # 11. Create GitHub issue using the GitHub API
        # Requirements: 5.3, 8.3
        try:
            logger.info("Creating GitHub issue via API")
            
            # Call the GitHub API integration
            github_result = create_github_issue(
                payload=payload_dict,
                github_token=settings.github_api_token,
                repo_owner=settings.github_repo_owner,
                repo_name=settings.github_repo_name
            )
            
            issue_url = github_result["issue_url"]
            issue_number = github_result["issue_number"]
            
            logger.info(f"Successfully created GitHub issue #{issue_number}: {issue_url}")
            
            # 12. Return success response
            return ReportResponse(
                status="success",
                issue_url=issue_url,
                issue_number=issue_number
            )
            
        except GitHubAPIError as e:
            # GitHub API specific errors
            # Requirements: 5.7, 8.3
            error_msg = str(e)
            logger.error(f"GitHub API error: {error_msg}")
            log_github_api_error(
                operation="create_issue",
                status_code=getattr(e, 'status_code', None),
                response_text=error_msg,
                context={"client_ip": client_ip, "report_type": payload.report_type}
            )
            
            # Return descriptive error to client
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to create GitHub issue: {error_msg}"
            )
        
        except ValueError as e:
            # Configuration or validation errors
            # Requirements: 8.3
            error_msg = str(e)
            logger.error(f"Configuration error: {error_msg}")
            log_error(
                error_type="ConfigurationError",
                message="Server configuration error during GitHub issue creation",
                context={"client_ip": client_ip},
                exception=e
            )
            
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Server configuration error: {error_msg}"
            )
        
    except HTTPException:
        # Re-raise HTTP exceptions (they're already properly formatted)
        raise
        
    except ValueError as e:
        # Handle validation errors from Pydantic or custom validation
        # Requirements: 8.3
        logger.error(f"Validation error: {e}")
        log_validation_error(
            field="payload",
            value="request_data",
            reason=str(e),
            context={"client_ip": client_ip}
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Validation error: {str(e)}"
        )
        
    except Exception as e:
        # Handle unexpected errors
        # Requirements: 8.3
        logger.error(f"Unexpected error processing report: {e}", exc_info=True)
        log_error(
            error_type="UnexpectedError",
            message="Unexpected error processing feedback report",
            context={"client_ip": client_ip},
            exception=e
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing your report. Please try Manual Mode."
        )


# Pending reports management endpoints
# Requirements: 8.2 - Local storage on failure with retry capability

@app.get("/api/feedback/pending")
async def list_pending_reports():
    """
    List all pending feedback reports from local storage.
    
    Returns:
        list: List of pending report metadata
    
    Requirements: 8.2
    """
    try:
        from src.feedback_storage import FeedbackStorage
        
        storage = FeedbackStorage()
        pending_reports = storage.list_pending_reports()
        
        logger.info(f"Retrieved {len(pending_reports)} pending reports")
        return pending_reports
        
    except Exception as e:
        logger.error(f"Failed to list pending reports: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list pending reports: {str(e)}"
        )


@app.post("/api/feedback/retry/{report_id}")
async def retry_pending_report(report_id: str, request: Request):
    """
    Retry submitting a pending feedback report.
    
    This endpoint:
    1. Loads the report payload from local storage
    2. Attempts to submit via Automatic Mode (GitHub API)
    3. Falls back to Manual Mode if backend unavailable
    4. Removes from pending list on success
    
    Args:
        report_id: Unique identifier of the report to retry
        request: FastAPI request object for accessing client info
    
    Returns:
        dict: Success/failure status with details
    
    Requirements: 8.2
    """
    client_ip = request.client.host if request.client else "unknown"
    logger.info(f"Retry request for report {report_id} from {client_ip}")
    
    try:
        from src.feedback_storage import FeedbackStorage
        
        storage = FeedbackStorage()
        
        # Load the report payload
        try:
            payload_dict = storage.get_report_payload(report_id)
        except FileNotFoundError:
            logger.warning(f"Report {report_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Report {report_id} not found"
            )
        except ValueError as e:
            logger.error(f"Invalid report payload {report_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid report payload: {str(e)}"
            )
        
        # Convert to Pydantic model for validation
        try:
            payload = ReportPayload(**payload_dict)
        except Exception as e:
            logger.error(f"Failed to validate report payload {report_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid report payload format: {str(e)}"
            )
        
        # Check rate limit
        limiter = get_rate_limiter()
        is_allowed, retry_after = limiter.check_rate_limit(client_ip)
        
        if not is_allowed:
            logger.warning(
                f"Rate limit exceeded for IP {client_ip} during retry. "
                f"Retry after {retry_after} seconds"
            )
            return JSONResponse(
                status_code=status.HTTP_200_OK,  # Return 200 but with error status
                content={
                    "success": False,
                    "error": f"Rate limit exceeded. Please try again in {retry_after} seconds.",
                    "fallback_mode": "manual"
                }
            )
        
        # Attempt to create GitHub issue
        try:
            logger.info(f"Attempting to create GitHub issue for report {report_id}")
            
            github_result = create_github_issue(
                payload=payload_dict,
                github_token=settings.github_api_token,
                repo_owner=settings.github_repo_owner,
                repo_name=settings.github_repo_name
            )
            
            issue_url = github_result["issue_url"]
            issue_number = github_result["issue_number"]
            
            logger.info(f"Successfully created GitHub issue #{issue_number} for report {report_id}")
            
            # Delete the report from local storage on success
            storage.delete_report(report_id)
            logger.info(f"Deleted report {report_id} from local storage")
            
            return {
                "success": True,
                "issue_url": issue_url,
                "issue_number": issue_number
            }
            
        except GitHubAPIError as e:
            # GitHub API error - suggest fallback to Manual Mode
            error_msg = str(e)
            logger.error(f"GitHub API error during retry of report {report_id}: {error_msg}")
            
            return {
                "success": False,
                "error": f"Failed to create GitHub issue: {error_msg}",
                "fallback_mode": "manual"
            }
        
        except ValueError as e:
            # Configuration error
            error_msg = str(e)
            logger.error(f"Configuration error during retry of report {report_id}: {error_msg}")
            
            return {
                "success": False,
                "error": f"Server configuration error: {error_msg}",
                "fallback_mode": "manual"
            }
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
        
    except Exception as e:
        logger.error(f"Unexpected error retrying report {report_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retry report: {str(e)}"
        )


@app.delete("/api/feedback/delete/{report_id}")
async def delete_pending_report(report_id: str):
    """
    Delete a pending feedback report from local storage.
    
    Args:
        report_id: Unique identifier of the report to delete
    
    Returns:
        dict: Success status
    
    Requirements: 8.2
    """
    logger.info(f"Delete request for report {report_id}")
    
    try:
        from src.feedback_storage import FeedbackStorage
        
        storage = FeedbackStorage()
        
        # Delete the report
        deleted = storage.delete_report(report_id)
        
        if not deleted:
            logger.warning(f"Report {report_id} not found for deletion")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Report {report_id} not found"
            )
        
        logger.info(f"Successfully deleted report {report_id}")
        return {"success": True}
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
        
    except Exception as e:
        logger.error(f"Failed to delete report {report_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete report: {str(e)}"
        )


# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Custom handler for HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "message": exc.detail,
            "fallback_mode": "manual"
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Custom handler for unexpected exceptions"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "status": "error",
            "message": "An unexpected error occurred",
            "fallback_mode": "manual"
        }
    )


def main():
    """
    Run the FastAPI application using uvicorn.
    
    This is the entry point for running the backend proxy service.
    """
    logger.info("Starting StoryCore-Engine Feedback Proxy Service")
    
    # Check if GitHub token is configured
    if settings.github_api_token == "PLACEHOLDER_TOKEN":
        logger.warning("=" * 80)
        logger.warning("WARNING: GITHUB_API_TOKEN not configured!")
        logger.warning("Set the GITHUB_API_TOKEN environment variable to enable GitHub integration")
        logger.warning("=" * 80)
    
    # Run the server
    uvicorn.run(
        "backend.feedback_proxy:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Enable auto-reload during development
        log_level="info"
    )


if __name__ == "__main__":
    main()
