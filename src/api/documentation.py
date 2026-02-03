"""
API Documentation Module

This module provides documentation generation and serving capabilities.
"""

import logging
from typing import Dict, Any, Optional

from .router import APIRouter
from .config import APIConfig
from .openapi_generator import OpenAPIGenerator
from .code_examples_generator import CodeExamplesGenerator
from .changelog import Changelog
from .models import APIResponse, RequestContext
from .base_handler import BaseAPIHandler


logger = logging.getLogger(__name__)


class DocumentationHandler(BaseAPIHandler):
    """
    Handler for API documentation endpoints.
    
    Provides:
    - OpenAPI specification generation
    - Interactive documentation
    - Endpoint schema retrieval
    - API version information
    """
    
    def __init__(self, config: APIConfig, router: APIRouter):
        """
        Initialize documentation handler.
        
        Args:
            config: API configuration
            router: API router with registered endpoints
        """
        super().__init__(config)
        self.router = router
        self.generator = OpenAPIGenerator(router, config)
        self.examples_generator = CodeExamplesGenerator(
            router,
            base_url=f"http://{config.host}:{config.port}"
        )
        self.changelog = Changelog()
        
        # Register documentation endpoints
        self.register_endpoints()
        
        logger.info("Initialized DocumentationHandler")
    
    def register_endpoints(self) -> None:
        """Register documentation endpoints with the router."""
        
        self.router.register_endpoint(
            path="storycore.api.openapi",
            method="GET",
            handler=self.get_openapi_spec,
            description="Get OpenAPI 3.0 specification",
            requires_auth=False,
        )
        
        self.router.register_endpoint(
            path="storycore.api.schema",
            method="GET",
            handler=self.get_endpoint_schema,
            description="Get schema for specific endpoint",
            requires_auth=False,
        )
        
        self.router.register_endpoint(
            path="storycore.api.version",
            method="GET",
            handler=self.get_version,
            description="Get API version information",
            requires_auth=False,
        )
        
        self.router.register_endpoint(
            path="storycore.api.endpoints",
            method="GET",
            handler=self.list_endpoints,
            description="List all available endpoints",
            requires_auth=False,
        )
        
        self.router.register_endpoint(
            path="storycore.api.examples",
            method="GET",
            handler=self.get_code_examples,
            description="Get code examples for endpoints",
            requires_auth=False,
        )
        
        self.router.register_endpoint(
            path="storycore.api.changelog",
            method="GET",
            handler=self.get_changelog,
            description="Get API changelog",
            requires_auth=False,
        )
    
    def get_openapi_spec(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Get OpenAPI 3.0 specification.
        
        Endpoint: storycore.api.openapi
        
        Args:
            params: Request parameters
                - format: "json" or "yaml" (default: "json")
            context: Request context
            
        Returns:
            API response with OpenAPI specification
        """
        try:
            format_type = params.get("format", "json").lower()
            
            if format_type == "yaml":
                spec_content = self.generator.generate_yaml()
                content_type = "application/x-yaml"
            else:
                spec_content = self.generator.generate_json()
                content_type = "application/json"
            
            data = {
                "specification": spec_content,
                "format": format_type,
                "content_type": content_type,
                "endpoint_count": len(self.router.list_endpoints()),
            }
            
            return self.create_success_response(data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def get_endpoint_schema(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Get schema for a specific endpoint.
        
        Endpoint: storycore.api.schema
        
        Args:
            params: Request parameters
                - endpoint: Endpoint path (required)
                - method: HTTP method (default: "POST")
            context: Request context
            
        Returns:
            API response with endpoint schema
        """
        error = self.validate_required_params(params, ["endpoint"], context)
        if error:
            return error
        
        try:
            endpoint_path = params["endpoint"]
            method = params.get("method", "POST").upper()
            
            # Get endpoint definition
            endpoint = self.router.get_endpoint(endpoint_path, method)
            
            if endpoint is None:
                return self.create_not_found_response(
                    "endpoint",
                    f"{method}:{endpoint_path}",
                    context,
                )
            
            # Build schema information
            data = {
                "path": endpoint.path,
                "method": endpoint.method,
                "description": endpoint.description,
                "schema": endpoint.schema,
                "async_capable": endpoint.async_capable,
                "requires_auth": endpoint.requires_auth,
            }
            
            return self.create_success_response(data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def get_version(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Get API version information.
        
        Endpoint: storycore.api.version
        
        Args:
            params: Request parameters (none required)
            context: Request context
            
        Returns:
            API response with version information
        """
        try:
            data = {
                "api_version": self.config.version,
                "openapi_version": "3.0.0",
                "endpoint_count": len(self.router.list_endpoints()),
                "features": {
                    "authentication": self.config.enable_auth,
                    "rate_limiting": self.config.enable_rate_limiting,
                    "async_operations": True,
                    "caching": True,
                },
            }
            
            return self.create_success_response(data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def list_endpoints(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        List all available endpoints.
        
        Endpoint: storycore.api.endpoints
        
        Args:
            params: Request parameters
                - category: Filter by category (optional)
            context: Request context
            
        Returns:
            API response with endpoint list
        """
        try:
            category_filter = params.get("category")
            
            # Get all endpoints
            endpoints = self.router.list_endpoints()
            
            # Build endpoint list
            endpoint_list = []
            for endpoint in endpoints:
                # Extract category
                category = self._extract_category(endpoint.path)
                
                # Apply filter if specified
                if category_filter and category.lower() != category_filter.lower():
                    continue
                
                endpoint_list.append({
                    "path": endpoint.path,
                    "method": endpoint.method,
                    "description": endpoint.description,
                    "category": category,
                    "async_capable": endpoint.async_capable,
                    "requires_auth": endpoint.requires_auth,
                })
            
            # Group by category
            by_category = {}
            for ep in endpoint_list:
                cat = ep["category"]
                if cat not in by_category:
                    by_category[cat] = []
                by_category[cat].append(ep)
            
            data = {
                "total_count": len(endpoint_list),
                "endpoints": endpoint_list,
                "by_category": by_category,
                "categories": list(by_category.keys()),
            }
            
            return self.create_success_response(data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
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
            return category.replace("_", " ").title()
        return "General"
    
    def get_code_examples(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Get code examples for endpoints.
        
        Endpoint: storycore.api.examples
        
        Args:
            params: Request parameters
                - endpoint: Specific endpoint path (optional)
                - category: Filter by category (optional)
                - language: Filter by language (optional: "python", "javascript", "curl")
            context: Request context
            
        Returns:
            API response with code examples
        """
        try:
            endpoint_path = params.get("endpoint")
            category = params.get("category")
            language_filter = params.get("language")
            
            if endpoint_path:
                # Get examples for specific endpoint
                endpoint = self.router.get_endpoint(endpoint_path, "POST")
                if endpoint is None:
                    # Try GET method
                    endpoint = self.router.get_endpoint(endpoint_path, "GET")
                
                if endpoint is None:
                    return self.create_error_response(
                        "NOT_FOUND",
                        f"Endpoint not found: {endpoint_path}",
                        context,
                    )
                
                examples = self.examples_generator.generate_examples_for_endpoint(endpoint)
                
                # Filter by language if specified
                if language_filter:
                    examples = [ex for ex in examples if ex.language.lower() == language_filter.lower()]
                
                data = {
                    "endpoint": endpoint_path,
                    "examples": [
                        {
                            "language": ex.language,
                            "code": ex.code,
                            "description": ex.description,
                        }
                        for ex in examples
                    ],
                }
            
            elif category:
                # Get examples for category
                examples_by_endpoint = self.examples_generator.generate_examples_for_category(category)
                
                data = {
                    "category": category,
                    "endpoint_count": len(examples_by_endpoint),
                    "examples": {}
                }
                
                for ep_path, examples in examples_by_endpoint.items():
                    # Filter by language if specified
                    if language_filter:
                        examples = [ex for ex in examples if ex.language.lower() == language_filter.lower()]
                    
                    data["examples"][ep_path] = [
                        {
                            "language": ex.language,
                            "code": ex.code,
                            "description": ex.description,
                        }
                        for ex in examples
                    ]
            
            else:
                # Get summary of available examples
                all_examples = self.examples_generator.generate_all_examples()
                
                data = {
                    "total_endpoints": len(all_examples),
                    "languages": ["Python", "JavaScript", "cURL"],
                    "categories": list(set(
                        self._extract_category(path)
                        for path in all_examples.keys()
                    )),
                    "note": "Specify 'endpoint' or 'category' parameter to get specific examples",
                }
            
            return self.create_success_response(data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def get_changelog(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Get API changelog.
        
        Endpoint: storycore.api.changelog
        
        Args:
            params: Request parameters
                - version: Filter by version (optional)
                - endpoint: Filter by endpoint (optional)
                - format: "json" or "markdown" (default: "json")
            context: Request context
            
        Returns:
            API response with changelog
        """
        try:
            version = params.get("version")
            endpoint = params.get("endpoint")
            format_type = params.get("format", "json").lower()
            
            if version:
                # Get entries for specific version
                entries = self.changelog.get_entries_by_version(version)
                data = {
                    "version": version,
                    "entry_count": len(entries),
                    "entries": [entry.to_dict() for entry in entries],
                }
            
            elif endpoint:
                # Get entries for specific endpoint
                entries = self.changelog.get_entries_by_endpoint(endpoint)
                data = {
                    "endpoint": endpoint,
                    "entry_count": len(entries),
                    "entries": [entry.to_dict() for entry in entries],
                }
            
            elif format_type == "markdown":
                # Get full changelog in markdown
                markdown = self.changelog.generate_markdown()
                data = {
                    "format": "markdown",
                    "content": markdown,
                    "versions": self.changelog.get_versions(),
                }
            
            else:
                # Get full changelog in JSON
                data = self.changelog.to_dict()
            
            return self.create_success_response(data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
