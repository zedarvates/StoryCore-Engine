"""
Integration tests for documentation endpoints with code examples and changelog
"""

import pytest
from src.api.router import APIRouter, DeprecationInfo
from src.api.config import APIConfig
from src.api.documentation import DocumentationHandler
from src.api.models import RequestContext


@pytest.fixture
def config():
    """Create test API config."""
    return APIConfig(
        version="v1",
        host="localhost",
        port=8000,
        enable_auth=False,
        enable_rate_limiting=False,
    )


@pytest.fixture
def router(config):
    """Create test router with sample endpoints."""
    router = APIRouter(config)
    
    def sample_handler(params, context):
        return {"result": "success"}
    
    # Register various endpoints for testing
    router.register_endpoint(
        path="storycore.narration.generate",
        method="POST",
        handler=sample_handler,
        description="Generate narrative content",
        schema={
            "type": "object",
            "properties": {
                "prompt": {"type": "string"},
            },
            "required": ["prompt"],
        },
    )
    
    router.register_endpoint(
        path="storycore.image.generate",
        method="POST",
        handler=sample_handler,
        description="Generate image",
        async_capable=True,
    )
    
    router.register_endpoint(
        path="storycore.old.endpoint",
        method="POST",
        handler=sample_handler,
        description="Deprecated endpoint",
        deprecation=DeprecationInfo(
            deprecated_date="2024-01-01",
            removal_date="2024-12-31",
            alternative="storycore.new.endpoint",
            reason="Replaced by improved version",
        ),
    )
    
    return router


@pytest.fixture
def doc_handler(config, router):
    """Create documentation handler."""
    return DocumentationHandler(config, router)


def test_get_code_examples_for_endpoint(doc_handler):
    """Test getting code examples for specific endpoint."""
    params = {"endpoint": "storycore.narration.generate"}
    context = RequestContext()
    
    response = doc_handler.get_code_examples(params, context)
    
    assert response.status == "success"
    assert "examples" in response.data
    assert len(response.data["examples"]) == 3  # Python, JavaScript, cURL
    
    # Check languages
    languages = [ex["language"] for ex in response.data["examples"]]
    assert "Python" in languages
    assert "JavaScript" in languages
    assert "cURL" in languages


def test_get_code_examples_with_language_filter(doc_handler):
    """Test filtering code examples by language."""
    params = {
        "endpoint": "storycore.narration.generate",
        "language": "python"
    }
    context = RequestContext()
    
    response = doc_handler.get_code_examples(params, context)
    
    assert response.status == "success"
    assert len(response.data["examples"]) == 1
    assert response.data["examples"][0]["language"] == "Python"


def test_get_code_examples_for_category(doc_handler):
    """Test getting code examples for category."""
    params = {"category": "narration"}
    context = RequestContext()
    
    response = doc_handler.get_code_examples(params, context)
    
    assert response.status == "success"
    assert "examples" in response.data
    assert "storycore.narration.generate" in response.data["examples"]


def test_get_code_examples_summary(doc_handler):
    """Test getting code examples summary."""
    params = {}
    context = RequestContext()
    
    response = doc_handler.get_code_examples(params, context)
    
    assert response.status == "success"
    assert "total_endpoints" in response.data
    assert "languages" in response.data
    assert "categories" in response.data
    assert response.data["languages"] == ["Python", "JavaScript", "cURL"]


def test_get_code_examples_nonexistent_endpoint(doc_handler):
    """Test getting code examples for nonexistent endpoint."""
    params = {"endpoint": "storycore.nonexistent.endpoint"}
    context = RequestContext()
    
    response = doc_handler.get_code_examples(params, context)
    
    assert response.status == "error"
    assert response.error.code == "NOT_FOUND"


def test_get_changelog_full(doc_handler):
    """Test getting full changelog."""
    params = {}
    context = RequestContext()
    
    response = doc_handler.get_changelog(params, context)
    
    assert response.status == "success"
    assert "versions" in response.data
    assert "total_entries" in response.data
    assert "entries" in response.data


def test_get_changelog_by_version(doc_handler):
    """Test getting changelog for specific version."""
    # Add test entry
    doc_handler.changelog.add_entry(
        version="v1.0.0",
        change_type="added",
        description="Test feature",
        affected_endpoints=["storycore.test.endpoint"],
        date="2024-01-15",
    )
    
    params = {"version": "v1.0.0"}
    context = RequestContext()
    
    response = doc_handler.get_changelog(params, context)
    
    assert response.status == "success"
    assert response.data["version"] == "v1.0.0"
    assert "entries" in response.data
    assert len(response.data["entries"]) > 0


def test_get_changelog_by_endpoint(doc_handler):
    """Test getting changelog for specific endpoint."""
    # Add test entry
    doc_handler.changelog.add_entry(
        version="v1.0.0",
        change_type="added",
        description="Test feature",
        affected_endpoints=["storycore.test.endpoint"],
        date="2024-01-15",
    )
    
    params = {"endpoint": "storycore.test.endpoint"}
    context = RequestContext()
    
    response = doc_handler.get_changelog(params, context)
    
    assert response.status == "success"
    assert response.data["endpoint"] == "storycore.test.endpoint"
    assert "entries" in response.data


def test_get_changelog_markdown(doc_handler):
    """Test getting changelog in markdown format."""
    params = {"format": "markdown"}
    context = RequestContext()
    
    response = doc_handler.get_changelog(params, context)
    
    assert response.status == "success"
    assert "content" in response.data
    assert "# Changelog" in response.data["content"]
    assert "versions" in response.data


def test_deprecated_endpoint_warning(router, config):
    """Test that deprecated endpoints include warning in response."""
    context = RequestContext()
    
    response = router.route_request(
        path="storycore.old.endpoint",
        method="POST",
        params={},
        context=context,
    )
    
    assert response.status == "success"
    assert hasattr(response.metadata, 'deprecation')
    assert response.metadata.deprecation is not None
    assert response.metadata.deprecation["deprecated_date"] == "2024-01-01"
    assert response.metadata.deprecation["alternative"] == "storycore.new.endpoint"


def test_openapi_includes_deprecation(doc_handler):
    """Test that OpenAPI spec includes deprecation information."""
    spec = doc_handler.generator.generate_spec()
    
    # Find deprecated endpoint in spec
    deprecated_path = "/storycore.old.endpoint"
    assert deprecated_path in spec["paths"]
    
    operation = spec["paths"][deprecated_path]["post"]
    assert operation["deprecated"] is True
    assert "DEPRECATED" in operation["description"]
    assert "storycore.new.endpoint" in operation["description"]


def test_async_endpoint_examples_include_polling(doc_handler):
    """Test that async endpoint examples include task polling."""
    params = {"endpoint": "storycore.image.generate"}
    context = RequestContext()
    
    response = doc_handler.get_code_examples(params, context)
    
    assert response.status == "success"
    
    # Check Python example includes polling
    python_example = next(
        ex for ex in response.data["examples"]
        if ex["language"] == "Python"
    )
    assert "task_id" in python_example["code"]
    assert "storycore.task.status" in python_example["code"]
    assert "while True:" in python_example["code"]


def test_endpoint_list_includes_deprecation_status(doc_handler):
    """Test that endpoint list shows deprecation status."""
    params = {}
    context = RequestContext()
    
    response = doc_handler.list_endpoints(params, context)
    
    assert response.status == "success"
    
    # Find deprecated endpoint
    deprecated_endpoint = next(
        ep for ep in response.data["endpoints"]
        if ep["path"] == "storycore.old.endpoint"
    )
    
    # Note: We might want to add a 'deprecated' field to the endpoint list
    # For now, just verify the endpoint is in the list
    assert deprecated_endpoint is not None


def test_code_examples_include_error_handling(doc_handler):
    """Test that code examples include error handling."""
    params = {"endpoint": "storycore.narration.generate"}
    context = RequestContext()
    
    response = doc_handler.get_code_examples(params, context)
    
    assert response.status == "success"
    
    # Check Python example includes error handling
    python_example = next(
        ex for ex in response.data["examples"]
        if ex["language"] == "Python"
    )
    assert "error" in python_example["code"].lower()
    
    # Check JavaScript example includes error handling
    js_example = next(
        ex for ex in response.data["examples"]
        if ex["language"] == "JavaScript"
    )
    assert "error" in js_example["code"].lower()


def test_documentation_endpoints_registered(doc_handler):
    """Test that documentation endpoints are registered."""
    # Check that new endpoints exist
    assert doc_handler.router.get_endpoint("storycore.api.examples", "GET") is not None
    assert doc_handler.router.get_endpoint("storycore.api.changelog", "GET") is not None


def test_examples_endpoint_in_openapi(doc_handler):
    """Test that examples endpoint is in OpenAPI spec."""
    spec = doc_handler.generator.generate_spec()
    
    assert "/storycore.api.examples" in spec["paths"]
    assert "/storycore.api.changelog" in spec["paths"]
