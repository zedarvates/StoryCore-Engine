"""
Security API Category Handler

This module implements all security capabilities including authentication validation,
permission checking, rate limiting, and audit logging.
"""

import logging
import time
import uuid
import hashlib
from typing import Dict, Any, Optional, List
from pathlib import Path
from datetime import datetime, timedelta

from ..base_handler import BaseAPIHandler
from ..models import APIResponse, RequestContext, ErrorCodes
from ..config import APIConfig
from ..router import APIRouter

from .security_models import (
    AuthValidateRequest,
    AuthValidateResult,
    PermissionsCheckRequest,
    PermissionsCheckResult,
    RateLimitRequest,
    RateLimitInfo,
    RateLimitResult,
    AuditLogRequest,
    AuditLogResult,
    TokenType,
    PermissionType,
    AuditEventType,
    RateLimitStatus,
    SUPPORTED_TOKEN_TYPES,
    SUPPORTED_PERMISSION_TYPES,
    SUPPORTED_AUDIT_EVENT_TYPES,
    SUPPORTED_AUDIT_SEVERITIES,
    SUPPORTED_AUDIT_RESULTS,
    validate_token_type,
    validate_permission_type,
    validate_audit_event_type,
    validate_audit_severity,
    validate_audit_result,
)


logger = logging.getLogger(__name__)



class SecurityCategoryHandler(BaseAPIHandler):
    """
    Handler for Security API category.
    
    Implements 4 endpoints:
    - storycore.security.auth.validate: Validate authentication tokens
    - storycore.security.permissions.check: Check user permissions
    - storycore.security.rate.limit: Get rate limit status
    - storycore.security.audit.log: Log security events
    """

    def __init__(self, config: APIConfig, router: APIRouter):
        """Initialize the security category handler."""
        super().__init__(config)
        self.router = router
        
        # Initialize token storage (in-memory for now)
        self.tokens: Dict[str, Dict[str, Any]] = {}
        
        # Initialize user permissions (in-memory for now)
        self.user_permissions: Dict[str, List[str]] = {
            "user_001": ["read", "write", "execute"],
            "user_002": ["read"],
            "admin_001": ["read", "write", "execute", "delete", "admin"],
        }
        
        # Initialize rate limit tracking
        self.rate_limits: Dict[str, Dict[str, Any]] = {}
        self.default_rate_limit = 100  # requests per minute
        
        # Initialize audit log storage
        self.audit_logs: List[Dict[str, Any]] = []
        self.max_audit_logs = 10000
        
        # Register all endpoints
        self.register_endpoints()
        
        logger.info("Initialized SecurityCategoryHandler with 4 endpoints")


    
    def register_endpoints(self) -> None:
        """Register all security endpoints with the router."""
        
        # Authentication validation endpoint
        self.router.register_endpoint(
            path="storycore.security.auth.validate",
            method="POST",
            handler=self.auth_validate,
            description="Validate authentication tokens",
            async_capable=False,
        )
        
        # Permission checking endpoint
        self.router.register_endpoint(
            path="storycore.security.permissions.check",
            method="POST",
            handler=self.permissions_check,
            description="Check user permissions for operations",
            async_capable=False,
        )
        
        # Rate limit status endpoint
        self.router.register_endpoint(
            path="storycore.security.rate.limit",
            method="POST",
            handler=self.rate_limit,
            description="Get current rate limit status",
            async_capable=False,
        )
        
        # Audit logging endpoint
        self.router.register_endpoint(
            path="storycore.security.audit.log",
            method="POST",
            handler=self.audit_log,
            description="Log security-relevant events",
            async_capable=False,
        )



    # Helper methods
    
    def _generate_token(self, user_id: str, token_type: str = "bearer", 
                       expires_in_seconds: int = 3600) -> str:
        """Generate a new authentication token."""
        token_data = f"{user_id}:{token_type}:{time.time()}"
        token = hashlib.sha256(token_data.encode()).hexdigest()
        
        # Store token with metadata
        self.tokens[token] = {
            "user_id": user_id,
            "token_type": token_type,
            "created_at": datetime.now(),
            "expires_at": datetime.now() + timedelta(seconds=expires_in_seconds),
            "permissions": self.user_permissions.get(user_id, []),
        }
        
        return token
    
    def _validate_token(self, token: str, validate_expiry: bool = True) -> Optional[Dict[str, Any]]:
        """Validate a token and return token data if valid."""
        if token not in self.tokens:
            return None
        
        token_data = self.tokens[token]
        
        # Check expiry if requested
        if validate_expiry:
            if datetime.now() > token_data["expires_at"]:
                return None
        
        return token_data
    
    def _check_permission(self, user_id: str, resource: str, action: str) -> tuple[bool, Optional[str]]:
        """Check if user has permission for action on resource."""
        user_perms = self.user_permissions.get(user_id, [])
        
        # Admin has all permissions
        if "admin" in user_perms:
            return True, "User has admin privileges"
        
        # Check if user has required permission
        if action.lower() in user_perms:
            return True, f"User has {action} permission"
        
        return False, f"User lacks {action} permission"
    
    def _get_rate_limit_key(self, user_id: Optional[str], endpoint: Optional[str]) -> str:
        """Generate rate limit key."""
        if user_id and endpoint:
            return f"{user_id}:{endpoint}"
        elif user_id:
            return f"{user_id}:*"
        elif endpoint:
            return f"*:{endpoint}"
        else:
            return "*:*"
    
    def _check_rate_limit(self, user_id: Optional[str], endpoint: Optional[str], 
                         window_seconds: int = 60) -> RateLimitInfo:
        """Check rate limit status for user/endpoint."""
        key = self._get_rate_limit_key(user_id, endpoint)
        
        now = datetime.now()
        
        # Initialize rate limit tracking if not exists
        if key not in self.rate_limits:
            self.rate_limits[key] = {
                "requests": [],
                "limit": self.default_rate_limit,
                "window_seconds": window_seconds,
            }
        
        limit_data = self.rate_limits[key]
        
        # Remove old requests outside window
        cutoff_time = now - timedelta(seconds=window_seconds)
        limit_data["requests"] = [
            req_time for req_time in limit_data["requests"]
            if req_time > cutoff_time
        ]
        
        # Calculate remaining
        current_count = len(limit_data["requests"])
        limit = limit_data["limit"]
        remaining = max(0, limit - current_count)
        
        # Determine status
        if current_count >= limit:
            status = "exceeded"
        elif current_count >= limit * 0.8:
            status = "warning"
        else:
            status = "ok"
        
        # Calculate reset time
        if limit_data["requests"]:
            oldest_request = min(limit_data["requests"])
            reset_at = oldest_request + timedelta(seconds=window_seconds)
        else:
            reset_at = now + timedelta(seconds=window_seconds)
        
        return RateLimitInfo(
            endpoint=endpoint or "*",
            limit=limit,
            remaining=remaining,
            reset_at=reset_at,
            status=status,
            window_seconds=window_seconds,
        )
    
    def _record_request(self, user_id: Optional[str], endpoint: Optional[str]) -> None:
        """Record a request for rate limiting."""
        key = self._get_rate_limit_key(user_id, endpoint)
        
        if key not in self.rate_limits:
            self.rate_limits[key] = {
                "requests": [],
                "limit": self.default_rate_limit,
                "window_seconds": 60,
            }
        
        self.rate_limits[key]["requests"].append(datetime.now())
    
    def _add_audit_log(self, event_type: str, user_id: Optional[str], 
                      resource: Optional[str], action: Optional[str],
                      result: str, details: Dict[str, Any], 
                      severity: str) -> str:
        """Add an audit log entry."""
        event_id = f"audit_{uuid.uuid4().hex[:12]}"
        
        log_entry = {
            "event_id": event_id,
            "event_type": event_type,
            "timestamp": datetime.now(),
            "user_id": user_id,
            "resource": resource,
            "action": action,
            "result": result,
            "severity": severity,
            "details": details,
        }
        
        self.audit_logs.append(log_entry)
        
        # Trim old entries if we exceed max
        if len(self.audit_logs) > self.max_audit_logs:
            self.audit_logs = self.audit_logs[-self.max_audit_logs:]
        
        return event_id



    # Security endpoints
    
    def auth_validate(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Validate authentication tokens.
        
        Endpoint: storycore.security.auth.validate
        Requirements: 15.1
        """
        self.log_request("storycore.security.auth.validate", params, context)
        
        try:
            # Validate required parameters
            error_response = self.validate_required_params(
                params, ["token"], context
            )
            if error_response:
                return error_response
            
            # Extract parameters
            token = params["token"]
            token_type = params.get("token_type", "bearer").lower()
            validate_expiry = params.get("validate_expiry", True)
            validate_permissions = params.get("validate_permissions", False)
            required_permissions = params.get("required_permissions", [])
            metadata = params.get("metadata", {})
            
            # Validate token type
            if not validate_token_type(token_type):
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid token type: {token_type}",
                    context=context,
                    details={
                        "token_type": token_type,
                        "supported_types": SUPPORTED_TOKEN_TYPES
                    },
                    remediation=f"Use one of: {', '.join(SUPPORTED_TOKEN_TYPES)}",
                )
            
            # Validate required permissions if provided
            if required_permissions:
                invalid_perms = [p for p in required_permissions if not validate_permission_type(p)]
                if invalid_perms:
                    return self.create_error_response(
                        error_code=ErrorCodes.VALIDATION_ERROR,
                        message=f"Invalid permissions: {', '.join(invalid_perms)}",
                        context=context,
                        details={
                            "invalid_permissions": invalid_perms,
                            "supported_permissions": SUPPORTED_PERMISSION_TYPES
                        },
                        remediation=f"Use valid permission types: {', '.join(SUPPORTED_PERMISSION_TYPES)}",
                    )
            
            start_validation = time.time()
            
            # Create some test tokens if none exist
            if not self.tokens:
                self._generate_token("user_001", "bearer", 3600)
                self._generate_token("user_002", "api_key", 7200)
                self._generate_token("admin_001", "jwt", 3600)
            
            # Validate token
            token_data = self._validate_token(token, validate_expiry)
            
            if not token_data:
                validation_time_ms = (time.time() - start_validation) * 1000
                
                result = AuthValidateResult(
                    valid=False,
                    token_type=token_type,
                    validation_time_ms=validation_time_ms,
                    error_message="Invalid or expired token",
                    metadata=metadata,
                )
                
                response_data = {
                    "valid": result.valid,
                    "user_id": result.user_id,
                    "username": result.username,
                    "token_type": result.token_type,
                    "expires_at": result.expires_at.isoformat() if result.expires_at else None,
                    "permissions": result.permissions,
                    "validation_time_ms": result.validation_time_ms,
                    "error_message": result.error_message,
                    "metadata": result.metadata,
                }
                
                response = self.create_success_response(response_data, context)
                self.log_response("storycore.security.auth.validate", response, context)
                return response
            
            # Check required permissions if requested
            if validate_permissions and required_permissions:
                user_perms = token_data.get("permissions", [])
                missing_perms = [p for p in required_permissions if p not in user_perms and "admin" not in user_perms]
                
                if missing_perms:
                    validation_time_ms = (time.time() - start_validation) * 1000
                    
                    result = AuthValidateResult(
                        valid=False,
                        user_id=token_data["user_id"],
                        token_type=token_data["token_type"],
                        expires_at=token_data["expires_at"],
                        permissions=user_perms,
                        validation_time_ms=validation_time_ms,
                        error_message=f"Missing required permissions: {', '.join(missing_perms)}",
                        metadata=metadata,
                    )
                    
                    response_data = {
                        "valid": result.valid,
                        "user_id": result.user_id,
                        "username": result.username,
                        "token_type": result.token_type,
                        "expires_at": result.expires_at.isoformat() if result.expires_at else None,
                        "permissions": result.permissions,
                        "validation_time_ms": result.validation_time_ms,
                        "error_message": result.error_message,
                        "metadata": result.metadata,
                    }
                    
                    response = self.create_success_response(response_data, context)
                    self.log_response("storycore.security.auth.validate", response, context)
                    return response
            
            validation_time_ms = (time.time() - start_validation) * 1000
            
            result = AuthValidateResult(
                valid=True,
                user_id=token_data["user_id"],
                username=f"user_{token_data['user_id']}",
                token_type=token_data["token_type"],
                expires_at=token_data["expires_at"],
                permissions=token_data.get("permissions", []),
                validation_time_ms=validation_time_ms,
                metadata=metadata,
            )
            
            response_data = {
                "valid": result.valid,
                "user_id": result.user_id,
                "username": result.username,
                "token_type": result.token_type,
                "expires_at": result.expires_at.isoformat() if result.expires_at else None,
                "permissions": result.permissions,
                "validation_time_ms": result.validation_time_ms,
                "error_message": result.error_message,
                "metadata": result.metadata,
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.security.auth.validate", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)



    def permissions_check(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Check user permissions for operations.
        
        Endpoint: storycore.security.permissions.check
        Requirements: 15.2
        """
        self.log_request("storycore.security.permissions.check", params, context)
        
        try:
            # Validate required parameters
            error_response = self.validate_required_params(
                params, ["user_id", "resource", "action"], context
            )
            if error_response:
                return error_response
            
            # Extract parameters
            user_id = params["user_id"]
            resource = params["resource"]
            action = params["action"].lower()
            check_context = params.get("context", {})
            metadata = params.get("metadata", {})
            
            # Validate action is a valid permission type
            if not validate_permission_type(action):
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid action: {action}",
                    context=context,
                    details={
                        "action": action,
                        "supported_actions": SUPPORTED_PERMISSION_TYPES
                    },
                    remediation=f"Use one of: {', '.join(SUPPORTED_PERMISSION_TYPES)}",
                )
            
            start_check = time.time()
            
            # Check if user exists
            if user_id not in self.user_permissions:
                check_time_ms = (time.time() - start_check) * 1000
                
                result = PermissionsCheckResult(
                    allowed=False,
                    user_id=user_id,
                    resource=resource,
                    action=action,
                    reason="User not found",
                    check_time_ms=check_time_ms,
                    metadata=metadata,
                )
                
                response_data = {
                    "allowed": result.allowed,
                    "user_id": result.user_id,
                    "resource": result.resource,
                    "action": result.action,
                    "matched_policies": result.matched_policies,
                    "reason": result.reason,
                    "check_time_ms": result.check_time_ms,
                    "metadata": result.metadata,
                }
                
                response = self.create_success_response(response_data, context)
                self.log_response("storycore.security.permissions.check", response, context)
                return response
            
            # Check permission
            allowed, reason = self._check_permission(user_id, resource, action)
            
            # Determine matched policies
            matched_policies = []
            if allowed:
                user_perms = self.user_permissions[user_id]
                if "admin" in user_perms:
                    matched_policies.append("admin_policy")
                else:
                    matched_policies.append(f"{action}_policy")
            
            check_time_ms = (time.time() - start_check) * 1000
            
            result = PermissionsCheckResult(
                allowed=allowed,
                user_id=user_id,
                resource=resource,
                action=action,
                matched_policies=matched_policies,
                reason=reason,
                check_time_ms=check_time_ms,
                metadata=metadata,
            )
            
            response_data = {
                "allowed": result.allowed,
                "user_id": result.user_id,
                "resource": result.resource,
                "action": result.action,
                "matched_policies": result.matched_policies,
                "reason": result.reason,
                "check_time_ms": result.check_time_ms,
                "metadata": result.metadata,
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.security.permissions.check", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)



    def rate_limit(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Get current rate limit status.
        
        Endpoint: storycore.security.rate.limit
        Requirements: 15.3
        """
        self.log_request("storycore.security.rate.limit", params, context)
        
        try:
            # Extract parameters
            user_id = params.get("user_id")
            endpoint = params.get("endpoint")
            include_history = params.get("include_history", False)
            time_window_seconds = params.get("time_window_seconds", 60)
            metadata = params.get("metadata", {})
            
            # Validate time window
            if time_window_seconds < 1 or time_window_seconds > 3600:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid time window: {time_window_seconds} seconds",
                    context=context,
                    details={"time_window_seconds": time_window_seconds, "valid_range": "1-3600"},
                    remediation="Use time window between 1 second and 1 hour (3600 seconds)",
                )
            
            start_check = time.time()
            
            # Get rate limit info
            limits = []
            
            if user_id and endpoint:
                # Specific user and endpoint
                limit_info = self._check_rate_limit(user_id, endpoint, time_window_seconds)
                limits.append(limit_info)
            elif user_id:
                # All endpoints for user
                # Check a few common endpoints
                common_endpoints = [
                    "storycore.narration.generate",
                    "storycore.image.generate",
                    "storycore.pipeline.execute",
                ]
                for ep in common_endpoints:
                    limit_info = self._check_rate_limit(user_id, ep, time_window_seconds)
                    limits.append(limit_info)
            elif endpoint:
                # All users for endpoint (aggregate)
                limit_info = self._check_rate_limit(None, endpoint, time_window_seconds)
                limits.append(limit_info)
            else:
                # Global rate limit status
                limit_info = self._check_rate_limit(None, None, time_window_seconds)
                limits.append(limit_info)
            
            # Determine overall status
            statuses = [limit.status for limit in limits]
            if "exceeded" in statuses:
                overall_status = "exceeded"
            elif "warning" in statuses:
                overall_status = "warning"
            else:
                overall_status = "ok"
            
            # Get request history if requested
            request_history = []
            if include_history:
                key = self._get_rate_limit_key(user_id, endpoint)
                if key in self.rate_limits:
                    limit_data = self.rate_limits[key]
                    request_history = [
                        {
                            "timestamp": req_time.isoformat(),
                            "endpoint": endpoint or "unknown",
                        }
                        for req_time in limit_data["requests"][-10:]  # Last 10 requests
                    ]
            
            check_time_ms = (time.time() - start_check) * 1000
            
            result = RateLimitResult(
                user_id=user_id,
                overall_status=overall_status,
                limits=limits,
                request_history=request_history,
                check_time_ms=check_time_ms,
                metadata=metadata,
            )
            
            response_data = {
                "user_id": result.user_id,
                "overall_status": result.overall_status,
                "limits": [limit.to_dict() for limit in result.limits],
                "request_history": result.request_history,
                "check_time_ms": result.check_time_ms,
                "metadata": result.metadata,
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.security.rate.limit", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)



    def audit_log(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Log security-relevant events.
        
        Endpoint: storycore.security.audit.log
        Requirements: 15.4
        """
        self.log_request("storycore.security.audit.log", params, context)
        
        try:
            # Validate required parameters
            error_response = self.validate_required_params(
                params, ["event_type"], context
            )
            if error_response:
                return error_response
            
            # Extract parameters
            event_type = params["event_type"].lower()
            user_id = params.get("user_id")
            resource = params.get("resource")
            action = params.get("action")
            result = params.get("result", "success").lower()
            details = params.get("details", {})
            severity = params.get("severity", "info").lower()
            metadata = params.get("metadata", {})
            
            # Validate event type
            if not validate_audit_event_type(event_type):
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid event type: {event_type}",
                    context=context,
                    details={
                        "event_type": event_type,
                        "supported_types": SUPPORTED_AUDIT_EVENT_TYPES
                    },
                    remediation=f"Use one of: {', '.join(SUPPORTED_AUDIT_EVENT_TYPES)}",
                )
            
            # Validate result
            if not validate_audit_result(result):
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid result: {result}",
                    context=context,
                    details={
                        "result": result,
                        "supported_results": SUPPORTED_AUDIT_RESULTS
                    },
                    remediation=f"Use one of: {', '.join(SUPPORTED_AUDIT_RESULTS)}",
                )
            
            # Validate severity
            if not validate_audit_severity(severity):
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid severity: {severity}",
                    context=context,
                    details={
                        "severity": severity,
                        "supported_severities": SUPPORTED_AUDIT_SEVERITIES
                    },
                    remediation=f"Use one of: {', '.join(SUPPORTED_AUDIT_SEVERITIES)}",
                )
            
            # Add audit log entry
            event_id = self._add_audit_log(
                event_type=event_type,
                user_id=user_id,
                resource=resource,
                action=action,
                result=result,
                details=details,
                severity=severity,
            )
            
            timestamp = datetime.now()
            
            # Optionally save to file for critical events
            log_path = None
            if severity == "critical":
                try:
                    audit_dir = Path("audit_logs")
                    audit_dir.mkdir(exist_ok=True)
                    
                    log_filename = f"audit_{timestamp.strftime('%Y%m%d')}.log"
                    log_path = str(audit_dir / log_filename)
                    
                    with open(log_path, 'a') as f:
                        log_line = f"{timestamp.isoformat()} | {event_id} | {event_type} | {severity} | {user_id} | {resource} | {action} | {result}\n"
                        f.write(log_line)
                    
                    logger.info(f"Saved critical audit log to {log_path}")
                    
                except Exception as e:
                    logger.error(f"Failed to save audit log: {e}")
            
            audit_result = AuditLogResult(
                logged=True,
                event_id=event_id,
                event_type=event_type,
                timestamp=timestamp,
                log_path=log_path,
                metadata=metadata,
            )
            
            response_data = {
                "logged": audit_result.logged,
                "event_id": audit_result.event_id,
                "event_type": audit_result.event_type,
                "timestamp": audit_result.timestamp.isoformat(),
                "log_path": audit_result.log_path,
                "metadata": audit_result.metadata,
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.security.audit.log", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)
