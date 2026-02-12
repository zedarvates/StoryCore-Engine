"""
API Package for StoryCore-Engine
"""

from .addon_routes import router as addon_router, init_addon_api
from .config import APIConfig
from .models import (
    APIResponse,
    ErrorDetails,
    ErrorCodes,
    ResponseMetadata,
    RequestContext,
    TaskResponse,
    HTTP_STATUS_CODES,
)
from .base_handler import BaseAPIHandler
from .validator import RequestValidator, ValidationError
from .formatter import ResponseFormatter
from .error_handler import ErrorHandler
from .router import APIRouter, EndpointDefinition
from .services import (
    AuthenticationService,
    AuthorizationService,
    User,
    Permission,
    AuthToken,
    RateLimitService,
    RateLimitStatus,
    ObservabilityService,
    TraceContext,
    TaskManager,
    Task,
    TaskStatus,
)
from .middleware import (
    create_auth_middleware,
    create_rate_limit_middleware,
    create_logging_middleware,
)
from .categories import (
    NarrationCategoryHandler,
    ExportIntegrationCategoryHandler,
)

__all__ = [
    'addon_router',
    'init_addon_api',
    'APIConfig',
    'APIResponse',
    'ErrorDetails',
    'ErrorCodes',
    'ResponseMetadata',
    'RequestContext',
    'TaskResponse',
    'HTTP_STATUS_CODES',
    'BaseAPIHandler',
    'RequestValidator',
    'ValidationError',
    'ResponseFormatter',
    'ErrorHandler',
    'APIRouter',
    'EndpointDefinition',
    'AuthenticationService',
    'AuthorizationService',
    'User',
    'Permission',
    'AuthToken',
    'RateLimitService',
    'RateLimitStatus',
    'ObservabilityService',
    'TraceContext',
    'TaskManager',
    'Task',
    'TaskStatus',
    'create_auth_middleware',
    'create_rate_limit_middleware',
    'create_logging_middleware',
    'NarrationCategoryHandler',
    'ExportIntegrationCategoryHandler',
]
