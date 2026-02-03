"""
OpenAPI Specification Generator

This module generates OpenAPI 3.0 specifications from registered API endpoints.
"""

import json
import yaml
from typing import Dict, Any, List, Optional
from datetime import datetime

from .router import APIRouter, EndpointDefinition
from .config import APIConfig
from .models import ErrorCodes


class OpenAPIGenerator:
    """
    Generates OpenAPI 3.0 specifications from registered API endpoints.
    
    Features:
    - Automatic spec generation from endpoint registry
    - Request/response schema extraction
    - Example generation
    - JSON and YAML output formats
    """
    
    def __init__(self, router: APIRouter, config: APIConfig):
        """
        Initialize the OpenAPI generator.
        
        Args:
            router: API router with registered endpoints
            config: API configuration
        """
        self.router = router
        self.config = config
    
    def generate_spec(self) -> Dict[str, Any]:
        """
        Generate complete OpenAPI 3.0 specification.
        
        Returns:
            OpenAPI specification as dictionary
        """
        spec = {
            "openapi": "3.0.0",
            "info": self._generate_info(),
            "servers": self._generate_servers(),
            "paths": self._generate_paths(),
            "components": self._generate_components(),
        }
        
        return spec
    
    def generate_json(self, indent: int = 2) -> str:
        """
        Generate OpenAPI specification in JSON format.
        
        Args:
            indent: JSON indentation level
            
        Returns:
            JSON string
        """
        spec = self.generate_spec()
        return json.dumps(spec, indent=indent)
    
    def generate_yaml(self) -> str:
        """
        Generate OpenAPI specification in YAML format.
        
        Returns:
            YAML string
        """
        spec = self.generate_spec()
        return yaml.dump(spec, default_flow_style=False, sort_keys=False)
    
    def _generate_info(self) -> Dict[str, Any]:
        """Generate the info section."""
        return {
            "title": "StoryCore Complete API System",
            "version": self.config.version,
            "description": (
                "Comprehensive API for StoryCore-Engine capabilities. "
                "Provides 113 endpoints across 14 functional categories for "
                "narrative generation, pipeline management, quality assurance, "
                "image/audio/video processing, and more."
            ),
            "contact": {
                "name": "StoryCore-Engine Team",
                "url": "https://github.com/storycore-engine",
            },
            "license": {
                "name": "MIT",
                "url": "https://opensource.org/licenses/MIT",
            },
        }
    
    def _generate_servers(self) -> List[Dict[str, Any]]:
        """Generate the servers section."""
        servers = [
            {
                "url": f"http://{self.config.host}:{self.config.port}",
                "description": "Local development server",
            }
        ]
        
        # Add production server if configured
        if hasattr(self.config, 'production_url') and self.config.production_url:
            servers.append({
                "url": self.config.production_url,
                "description": "Production server",
            })
        
        return servers
    
    def _generate_paths(self) -> Dict[str, Any]:
        """Generate the paths section from registered endpoints."""
        paths = {}
        
        # Group endpoints by path
        for endpoint in self.router.list_endpoints():
            path = f"/{endpoint.path}"
            method = endpoint.method.lower()
            
            if path not in paths:
                paths[path] = {}
            
            paths[path][method] = self._generate_operation(endpoint)
        
        return paths
    
    def _generate_operation(self, endpoint: EndpointDefinition) -> Dict[str, Any]:
        """
        Generate an operation object for an endpoint.
        
        Args:
            endpoint: Endpoint definition
            
        Returns:
            OpenAPI operation object
        """
        operation = {
            "summary": endpoint.description or endpoint.path,
            "operationId": endpoint.path.replace(".", "_"),
            "tags": [self._extract_category(endpoint.path)],
        }
        
        # Add deprecation if applicable
        if endpoint.deprecation:
            operation["deprecated"] = True
            
            # Build deprecation description
            deprecation_desc = f"\n\n**DEPRECATED** (since {endpoint.deprecation.deprecated_date})"
            
            if endpoint.deprecation.removal_date:
                deprecation_desc += f"\n\nThis endpoint will be removed on {endpoint.deprecation.removal_date}."
            
            if endpoint.deprecation.alternative:
                deprecation_desc += f"\n\nPlease use `{endpoint.deprecation.alternative}` instead."
            
            if endpoint.deprecation.reason:
                deprecation_desc += f"\n\nReason: {endpoint.deprecation.reason}"
            
            operation["description"] = (endpoint.description or "") + deprecation_desc
        
        # Add request body if POST/PUT/PATCH
        if endpoint.method in ["POST", "PUT", "PATCH"]:
            operation["requestBody"] = self._generate_request_body(endpoint)
        
        # Add responses
        operation["responses"] = self._generate_responses(endpoint)
        
        # Add security if required
        if endpoint.requires_auth:
            operation["security"] = [{"bearerAuth": []}]
        
        # Add async indicator in description
        if endpoint.async_capable:
            async_desc = (
                "\n\n**Note:** This endpoint supports asynchronous execution. "
                "Long-running operations will return status 'pending' with a task_id."
            )
            if "description" in operation:
                operation["description"] += async_desc
            else:
                operation["description"] = async_desc
        
        return operation
    
    def _generate_request_body(self, endpoint: EndpointDefinition) -> Dict[str, Any]:
        """
        Generate request body specification.
        
        Args:
            endpoint: Endpoint definition
            
        Returns:
            OpenAPI request body object
        """
        # Extract schema from endpoint if available
        schema = endpoint.schema or {"type": "object"}
        
        # Add examples based on endpoint path
        examples = self._generate_request_examples(endpoint)
        
        request_body = {
            "required": True,
            "content": {
                "application/json": {
                    "schema": schema,
                }
            }
        }
        
        if examples:
            request_body["content"]["application/json"]["examples"] = examples
        
        return request_body
    
    def _generate_responses(self, endpoint: EndpointDefinition) -> Dict[str, Any]:
        """
        Generate responses specification.
        
        Args:
            endpoint: Endpoint definition
            
        Returns:
            OpenAPI responses object
        """
        responses = {
            "200": {
                "description": "Successful response",
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/SuccessResponse"},
                        "examples": self._generate_response_examples(endpoint),
                    }
                }
            },
            "400": {
                "description": "Validation error",
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/ErrorResponse"},
                    }
                }
            },
            "401": {
                "description": "Authentication required",
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/ErrorResponse"},
                    }
                }
            },
            "404": {
                "description": "Resource not found",
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/ErrorResponse"},
                    }
                }
            },
            "429": {
                "description": "Rate limit exceeded",
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/ErrorResponse"},
                    }
                }
            },
            "500": {
                "description": "Internal server error",
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/ErrorResponse"},
                    }
                }
            },
        }
        
        # Add pending response for async endpoints
        if endpoint.async_capable:
            responses["202"] = {
                "description": "Async operation initiated",
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/PendingResponse"},
                    }
                }
            }
        
        return responses
    
    def _generate_components(self) -> Dict[str, Any]:
        """Generate the components section."""
        return {
            "schemas": self._generate_schemas(),
            "securitySchemes": self._generate_security_schemes(),
        }
    
    def _generate_schemas(self) -> Dict[str, Any]:
        """Generate common schema definitions."""
        return {
            "SuccessResponse": {
                "type": "object",
                "required": ["status", "data", "metadata"],
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["success"],
                        "description": "Response status",
                    },
                    "data": {
                        "type": "object",
                        "description": "Response data",
                    },
                    "metadata": {
                        "$ref": "#/components/schemas/ResponseMetadata",
                    },
                },
            },
            "ErrorResponse": {
                "type": "object",
                "required": ["status", "error", "metadata"],
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["error"],
                        "description": "Response status",
                    },
                    "error": {
                        "$ref": "#/components/schemas/ErrorDetails",
                    },
                    "metadata": {
                        "$ref": "#/components/schemas/ResponseMetadata",
                    },
                },
            },
            "PendingResponse": {
                "type": "object",
                "required": ["status", "data", "metadata"],
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["pending"],
                        "description": "Response status",
                    },
                    "data": {
                        "type": "object",
                        "required": ["task_id"],
                        "properties": {
                            "task_id": {
                                "type": "string",
                                "description": "Task ID for status polling",
                            },
                        },
                    },
                    "metadata": {
                        "$ref": "#/components/schemas/ResponseMetadata",
                    },
                },
            },
            "ResponseMetadata": {
                "type": "object",
                "required": ["request_id", "timestamp", "duration_ms", "api_version"],
                "properties": {
                    "request_id": {
                        "type": "string",
                        "description": "Unique request identifier",
                        "example": "req_abc123xyz",
                    },
                    "timestamp": {
                        "type": "string",
                        "format": "date-time",
                        "description": "Response timestamp",
                    },
                    "duration_ms": {
                        "type": "number",
                        "description": "Request duration in milliseconds",
                        "example": 45.2,
                    },
                    "api_version": {
                        "type": "string",
                        "description": "API version",
                        "example": "v1",
                    },
                },
            },
            "ErrorDetails": {
                "type": "object",
                "required": ["code", "message"],
                "properties": {
                    "code": {
                        "type": "string",
                        "enum": [
                            ErrorCodes.VALIDATION_ERROR,
                            ErrorCodes.AUTHENTICATION_REQUIRED,
                            ErrorCodes.AUTHORIZATION_DENIED,
                            ErrorCodes.NOT_FOUND,
                            ErrorCodes.CONFLICT,
                            ErrorCodes.RATE_LIMIT_EXCEEDED,
                            ErrorCodes.INTERNAL_ERROR,
                            ErrorCodes.SERVICE_UNAVAILABLE,
                            ErrorCodes.TIMEOUT,
                            ErrorCodes.DEPENDENCY_ERROR,
                        ],
                        "description": "Error code",
                    },
                    "message": {
                        "type": "string",
                        "description": "Human-readable error message",
                    },
                    "details": {
                        "type": "object",
                        "description": "Additional error details",
                    },
                    "remediation": {
                        "type": "string",
                        "description": "Suggested fix for the error",
                    },
                },
            },
        }
    
    def _generate_security_schemes(self) -> Dict[str, Any]:
        """Generate security scheme definitions."""
        schemes = {}
        
        if self.config.enable_auth:
            schemes["bearerAuth"] = {
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "JWT",
                "description": "JWT token authentication",
            }
        
        return schemes
    
    def _extract_category(self, path: str) -> str:
        """
        Extract category name from endpoint path.
        
        Args:
            path: Endpoint path (e.g., "storycore.narration.generate")
            
        Returns:
            Category name (e.g., "Narration")
        """
        parts = path.split(".")
        if len(parts) >= 2:
            category = parts[1]
            # Capitalize and format
            return category.replace("_", " ").title()
        return "General"
    
    def _generate_request_examples(self, endpoint: EndpointDefinition) -> Dict[str, Any]:
        """
        Generate request examples for an endpoint.
        
        Args:
            endpoint: Endpoint definition
            
        Returns:
            Examples dictionary
        """
        examples = {}
        
        # Generate examples based on endpoint path
        if "narration.generate" in endpoint.path:
            examples["basic"] = {
                "summary": "Basic narrative generation",
                "value": {
                    "prompt": "A hero embarks on a quest to save their village",
                    "options": {
                        "genre": "fantasy",
                        "tone": "epic",
                        "length": 500,
                    }
                }
            }
        elif "pipeline.init" in endpoint.path:
            examples["basic"] = {
                "summary": "Initialize new project",
                "value": {
                    "project_name": "my-story",
                    "path": "/path/to/projects",
                }
            }
        elif "image.generate" in endpoint.path:
            examples["basic"] = {
                "summary": "Generate image",
                "value": {
                    "prompt": "A mystical forest at twilight",
                    "width": 1024,
                    "height": 1024,
                    "seed": 42,
                }
            }
        elif "memory.store" in endpoint.path:
            examples["basic"] = {
                "summary": "Store memory",
                "value": {
                    "key": "character_name",
                    "value": "Aria the Brave",
                }
            }
        
        return examples
    
    def _generate_response_examples(self, endpoint: EndpointDefinition) -> Dict[str, Any]:
        """
        Generate response examples for an endpoint.
        
        Args:
            endpoint: Endpoint definition
            
        Returns:
            Examples dictionary
        """
        examples = {}
        
        # Success example
        if "narration.generate" in endpoint.path:
            examples["success"] = {
                "summary": "Successful generation",
                "value": {
                    "status": "success",
                    "data": {
                        "content": "In a small village nestled between mountains...",
                        "metadata": {
                            "prompt": "A hero embarks on a quest",
                            "model": "gpt-4",
                        }
                    },
                    "metadata": {
                        "request_id": "req_abc123",
                        "timestamp": "2024-01-15T10:30:00Z",
                        "duration_ms": 1250.5,
                        "api_version": "v1",
                    }
                }
            }
        elif "pipeline.status" in endpoint.path:
            examples["success"] = {
                "summary": "Pipeline status",
                "value": {
                    "status": "success",
                    "data": {
                        "project_name": "my-story",
                        "current_stage": "promote",
                        "progress": 0.65,
                        "stages_completed": ["init", "grid"],
                        "stages_remaining": ["qa", "export"],
                    },
                    "metadata": {
                        "request_id": "req_xyz789",
                        "timestamp": "2024-01-15T10:31:00Z",
                        "duration_ms": 15.2,
                        "api_version": "v1",
                    }
                }
            }
        
        # Async example for async-capable endpoints
        if endpoint.async_capable:
            examples["async"] = {
                "summary": "Async operation initiated",
                "value": {
                    "status": "pending",
                    "data": {
                        "task_id": "task_def456",
                    },
                    "metadata": {
                        "request_id": "req_async123",
                        "timestamp": "2024-01-15T10:32:00Z",
                        "duration_ms": 25.0,
                        "api_version": "v1",
                    }
                }
            }
        
        return examples
