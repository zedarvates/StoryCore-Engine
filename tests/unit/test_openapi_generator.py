"""
Unit tests for OpenAPI specification generator.
"""

import pytest
import json
import yaml
from src.api.openapi_generator import OpenAPIGenerator
from src.api.router import APIRouter
from src.api.config import APIConfig
from src.api.models import APIResponse, RequestContext


@pytest.fixture
def api_config():
    """Create test API configuration."""
    return APIConfig(
        version="v1",
        host="localhost",
        port=8000,
        enable_auth=True,
        enable_rate_limiting=True,
        rate_limit_requests_per_minute=60,
        cache_ttl_seconds=300,
        async_task_timeout_seconds=3600,
        log_level="INFO",
        cors_origins=["*"],
    )


@pytest.fixture
def router(api_config):
    """Create test router with sample endpoints."""
    router = APIRouter(api_config)
    
    # Register sample endpoints
    def sample_handler(params, context):
        return APIResponse(status="success", data={"result": "ok"})
    
    router.register_endpoint(
        path="storycore.narration.generate",
        method="POST",
        handler=sample_handler,
        schema={
            "type": "object",
            "properties": {
                "prompt": {"type": "string"},
                "options": {"type": "object"},
            },
            "required": ["prompt"],
        },
        async_capable=True,
        requires_auth=False,
        description="Generate narrative content",
    )
    
    router.register_endpoint(
        path="storycore.pipeline.status",
        method="GET",
        handler=sample_handler,
        schema={
            "type": "object",
            "properties": {
                "project_name": {"type": "string"},
            },
            "required": ["project_name"],
        },
        async_capable=False,
        requires_auth=True,
        description="Get pipeline status",
    )
    
    router.register_endpoint(
        path="storycore.memory.store",
        method="POST",
        handler=sample_handler,
        description="Store memory item",
    )
    
    return router


@pytest.fixture
def generator(router, api_config):
    """Create OpenAPI generator."""
    return OpenAPIGenerator(router, api_config)


class TestOpenAPIGenerator:
    """Test suite for OpenAPI generator."""
    
    def test_generate_spec_structure(self, generator):
        """Test that generated spec has correct structure."""
        spec = generator.generate_spec()
        
        # Check top-level structure
        assert "openapi" in spec
        assert spec["openapi"] == "3.0.0"
        assert "info" in spec
        assert "servers" in spec
        assert "paths" in spec
        assert "components" in spec
    
    def test_info_section(self, generator):
        """Test info section generation."""
        spec = generator.generate_spec()
        info = spec["info"]
        
        assert info["title"] == "StoryCore Complete API System"
        assert info["version"] == "v1"
        assert "description" in info
        assert "contact" in info
        assert "license" in info
    
    def test_servers_section(self, generator):
        """Test servers section generation."""
        spec = generator.generate_spec()
        servers = spec["servers"]
        
        assert len(servers) >= 1
        assert servers[0]["url"] == "http://localhost:8000"
        assert servers[0]["description"] == "Local development server"
    
    def test_paths_section(self, generator):
        """Test paths section generation."""
        spec = generator.generate_spec()
        paths = spec["paths"]
        
        # Check that registered endpoints are present
        assert "/storycore.narration.generate" in paths
        assert "/storycore.pipeline.status" in paths
        assert "/storycore.memory.store" in paths
    
    def test_endpoint_operation(self, generator):
        """Test individual endpoint operation generation."""
        spec = generator.generate_spec()
        
        # Check narration.generate endpoint
        narration_op = spec["paths"]["/storycore.narration.generate"]["post"]
        
        assert "summary" in narration_op
        assert "operationId" in narration_op
        assert narration_op["operationId"] == "storycore_narration_generate"
        assert "tags" in narration_op
        assert "Narration" in narration_op["tags"]
        assert "requestBody" in narration_op
        assert "responses" in narration_op
    
    def test_async_endpoint_indicator(self, generator):
        """Test that async endpoints are marked correctly."""
        spec = generator.generate_spec()
        
        # Check async endpoint
        narration_op = spec["paths"]["/storycore.narration.generate"]["post"]
        assert "description" in narration_op
        assert "asynchronous" in narration_op["description"].lower()
        
        # Check responses include 202
        assert "202" in narration_op["responses"]
    
    def test_auth_required_endpoint(self, generator):
        """Test that auth-required endpoints have security."""
        spec = generator.generate_spec()
        
        # Check auth-required endpoint
        pipeline_op = spec["paths"]["/storycore.pipeline.status"]["get"]
        assert "security" in pipeline_op
        assert {"bearerAuth": []} in pipeline_op["security"]
    
    def test_request_body_generation(self, generator):
        """Test request body generation."""
        spec = generator.generate_spec()
        
        narration_op = spec["paths"]["/storycore.narration.generate"]["post"]
        request_body = narration_op["requestBody"]
        
        assert request_body["required"] is True
        assert "application/json" in request_body["content"]
        assert "schema" in request_body["content"]["application/json"]
    
    def test_responses_generation(self, generator):
        """Test responses generation."""
        spec = generator.generate_spec()
        
        narration_op = spec["paths"]["/storycore.narration.generate"]["post"]
        responses = narration_op["responses"]
        
        # Check standard responses
        assert "200" in responses
        assert "400" in responses
        assert "401" in responses
        assert "404" in responses
        assert "429" in responses
        assert "500" in responses
        
        # Check async response
        assert "202" in responses
    
    def test_components_schemas(self, generator):
        """Test components schemas generation."""
        spec = generator.generate_spec()
        schemas = spec["components"]["schemas"]
        
        # Check required schemas
        assert "SuccessResponse" in schemas
        assert "ErrorResponse" in schemas
        assert "PendingResponse" in schemas
        assert "ResponseMetadata" in schemas
        assert "ErrorDetails" in schemas
    
    def test_success_response_schema(self, generator):
        """Test success response schema structure."""
        spec = generator.generate_spec()
        success_schema = spec["components"]["schemas"]["SuccessResponse"]
        
        assert success_schema["type"] == "object"
        assert "status" in success_schema["required"]
        assert "data" in success_schema["required"]
        assert "metadata" in success_schema["required"]
        
        # Check properties
        assert success_schema["properties"]["status"]["enum"] == ["success"]
    
    def test_error_response_schema(self, generator):
        """Test error response schema structure."""
        spec = generator.generate_spec()
        error_schema = spec["components"]["schemas"]["ErrorResponse"]
        
        assert error_schema["type"] == "object"
        assert "status" in error_schema["required"]
        assert "error" in error_schema["required"]
        assert "metadata" in error_schema["required"]
        
        # Check properties
        assert error_schema["properties"]["status"]["enum"] == ["error"]
    
    def test_pending_response_schema(self, generator):
        """Test pending response schema structure."""
        spec = generator.generate_spec()
        pending_schema = spec["components"]["schemas"]["PendingResponse"]
        
        assert pending_schema["type"] == "object"
        assert "status" in pending_schema["required"]
        assert "data" in pending_schema["required"]
        
        # Check task_id in data
        data_props = pending_schema["properties"]["data"]["properties"]
        assert "task_id" in data_props
    
    def test_error_details_schema(self, generator):
        """Test error details schema structure."""
        spec = generator.generate_spec()
        error_details = spec["components"]["schemas"]["ErrorDetails"]
        
        assert error_details["type"] == "object"
        assert "code" in error_details["required"]
        assert "message" in error_details["required"]
        
        # Check error codes enum
        assert "enum" in error_details["properties"]["code"]
        error_codes = error_details["properties"]["code"]["enum"]
        assert "VALIDATION_ERROR" in error_codes
        assert "NOT_FOUND" in error_codes
    
    def test_security_schemes(self, generator):
        """Test security schemes generation."""
        spec = generator.generate_spec()
        security_schemes = spec["components"]["securitySchemes"]
        
        # Check bearer auth is present (auth is enabled in config)
        assert "bearerAuth" in security_schemes
        assert security_schemes["bearerAuth"]["type"] == "http"
        assert security_schemes["bearerAuth"]["scheme"] == "bearer"
    
    def test_json_output(self, generator):
        """Test JSON output generation."""
        json_output = generator.generate_json()
        
        # Verify it's valid JSON
        spec = json.loads(json_output)
        assert spec["openapi"] == "3.0.0"
        assert "paths" in spec
    
    def test_yaml_output(self, generator):
        """Test YAML output generation."""
        yaml_output = generator.generate_yaml()
        
        # Verify it's valid YAML
        spec = yaml.safe_load(yaml_output)
        assert spec["openapi"] == "3.0.0"
        assert "paths" in spec
    
    def test_category_extraction(self, generator):
        """Test category extraction from endpoint paths."""
        # Test various path formats
        assert generator._extract_category("storycore.narration.generate") == "Narration"
        assert generator._extract_category("storycore.pipeline.status") == "Pipeline"
        assert generator._extract_category("storycore.qa.narrative.coherence") == "Qa"
        assert generator._extract_category("storycore.i18n.translate") == "I18N"
    
    def test_request_examples(self, generator):
        """Test request example generation."""
        spec = generator.generate_spec()
        
        # Check narration endpoint has examples
        narration_op = spec["paths"]["/storycore.narration.generate"]["post"]
        content = narration_op["requestBody"]["content"]["application/json"]
        
        if "examples" in content:
            examples = content["examples"]
            assert len(examples) > 0
            # Check example structure
            for example in examples.values():
                assert "value" in example
    
    def test_response_examples(self, generator):
        """Test response example generation."""
        spec = generator.generate_spec()
        
        # Check narration endpoint has response examples
        narration_op = spec["paths"]["/storycore.narration.generate"]["post"]
        success_response = narration_op["responses"]["200"]
        content = success_response["content"]["application/json"]
        
        if "examples" in content:
            examples = content["examples"]
            assert len(examples) > 0
    
    def test_all_endpoints_included(self, generator, router):
        """Test that all registered endpoints are included in spec."""
        spec = generator.generate_spec()
        paths = spec["paths"]
        
        # Get all registered endpoints
        registered_endpoints = router.list_endpoints()
        
        # Check each endpoint is in the spec
        for endpoint in registered_endpoints:
            path = f"/{endpoint.path}"
            method = endpoint.method.lower()
            
            assert path in paths, f"Path {path} not in spec"
            assert method in paths[path], f"Method {method} not in {path}"
    
    def test_spec_completeness(self, generator):
        """Test that spec is complete and valid."""
        spec = generator.generate_spec()
        
        # Check all required top-level fields
        required_fields = ["openapi", "info", "servers", "paths", "components"]
        for field in required_fields:
            assert field in spec, f"Missing required field: {field}"
        
        # Check info completeness
        info_fields = ["title", "version", "description"]
        for field in info_fields:
            assert field in spec["info"], f"Missing info field: {field}"
        
        # Check components completeness
        assert "schemas" in spec["components"]
        assert "securitySchemes" in spec["components"]
        
        # Check required schemas exist
        required_schemas = [
            "SuccessResponse",
            "ErrorResponse",
            "PendingResponse",
            "ResponseMetadata",
            "ErrorDetails",
        ]
        for schema in required_schemas:
            assert schema in spec["components"]["schemas"], f"Missing schema: {schema}"
    
    def test_endpoint_descriptions(self, generator):
        """Test that endpoints have descriptions."""
        spec = generator.generate_spec()
        
        # Check that endpoints have summaries
        for path, methods in spec["paths"].items():
            for method, operation in methods.items():
                assert "summary" in operation, f"Missing summary for {method} {path}"
                assert operation["summary"], f"Empty summary for {method} {path}"


class TestOpenAPIValidation:
    """Test OpenAPI spec validation."""
    
    def test_valid_openapi_version(self, generator):
        """Test that OpenAPI version is valid."""
        spec = generator.generate_spec()
        assert spec["openapi"] in ["3.0.0", "3.0.1", "3.0.2", "3.0.3"]
    
    def test_valid_http_methods(self, generator):
        """Test that only valid HTTP methods are used."""
        spec = generator.generate_spec()
        valid_methods = ["get", "post", "put", "patch", "delete", "options", "head"]
        
        for path, methods in spec["paths"].items():
            for method in methods.keys():
                assert method in valid_methods, f"Invalid method {method} in {path}"
    
    def test_valid_response_codes(self, generator):
        """Test that only valid HTTP status codes are used."""
        spec = generator.generate_spec()
        valid_codes = ["200", "201", "202", "204", "400", "401", "403", "404", "409", "429", "500", "502", "503", "504"]
        
        for path, methods in spec["paths"].items():
            for method, operation in methods.items():
                for code in operation["responses"].keys():
                    assert code in valid_codes, f"Invalid response code {code} in {method} {path}"
    
    def test_schema_references_valid(self, generator):
        """Test that all schema references are valid."""
        spec = generator.generate_spec()
        schemas = spec["components"]["schemas"]
        
        def check_refs(obj):
            """Recursively check $ref validity."""
            if isinstance(obj, dict):
                if "$ref" in obj:
                    ref = obj["$ref"]
                    if ref.startswith("#/components/schemas/"):
                        schema_name = ref.split("/")[-1]
                        assert schema_name in schemas, f"Invalid schema reference: {ref}"
                for value in obj.values():
                    check_refs(value)
            elif isinstance(obj, list):
                for item in obj:
                    check_refs(item)
        
        # Check all paths
        check_refs(spec["paths"])
        
        # Check all schemas
        check_refs(spec["components"]["schemas"])


class TestOpenAPIIntegration:
    """Integration tests for OpenAPI generator."""
    
    def test_generate_from_empty_router(self, api_config):
        """Test generating spec from empty router."""
        router = APIRouter(api_config)
        generator = OpenAPIGenerator(router, api_config)
        
        spec = generator.generate_spec()
        
        # Should still have valid structure
        assert spec["openapi"] == "3.0.0"
        assert "paths" in spec
        assert len(spec["paths"]) == 0
    
    def test_generate_with_many_endpoints(self, api_config):
        """Test generating spec with many endpoints."""
        router = APIRouter(api_config)
        
        def handler(params, context):
            return APIResponse(status="success", data={})
        
        # Register 50 endpoints
        for i in range(50):
            router.register_endpoint(
                path=f"storycore.test.endpoint{i}",
                method="POST",
                handler=handler,
                description=f"Test endpoint {i}",
            )
        
        generator = OpenAPIGenerator(router, api_config)
        spec = generator.generate_spec()
        
        # Check all endpoints are present
        assert len(spec["paths"]) == 50
    
    def test_json_yaml_equivalence(self, generator):
        """Test that JSON and YAML outputs are equivalent."""
        json_output = generator.generate_json()
        yaml_output = generator.generate_yaml()
        
        json_spec = json.loads(json_output)
        yaml_spec = yaml.safe_load(yaml_output)
        
        # Compare key fields
        assert json_spec["openapi"] == yaml_spec["openapi"]
        assert json_spec["info"] == yaml_spec["info"]
        assert len(json_spec["paths"]) == len(yaml_spec["paths"])
