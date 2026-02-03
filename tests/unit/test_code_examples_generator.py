"""
Unit tests for Code Examples Generator
"""

import pytest
from src.api.code_examples_generator import CodeExamplesGenerator, CodeExample
from src.api.router import APIRouter, EndpointDefinition
from src.api.config import APIConfig


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
    
    # Register sample endpoints
    def sample_handler(params, context):
        return {"result": "success"}
    
    router.register_endpoint(
        path="storycore.narration.generate",
        method="POST",
        handler=sample_handler,
        description="Generate narrative content",
        schema={
            "type": "object",
            "properties": {
                "prompt": {"type": "string"},
                "options": {"type": "object"},
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
        schema={
            "type": "object",
            "properties": {
                "prompt": {"type": "string"},
                "width": {"type": "integer"},
                "height": {"type": "integer"},
            },
            "required": ["prompt"],
        },
    )
    
    router.register_endpoint(
        path="storycore.pipeline.status",
        method="GET",
        handler=sample_handler,
        description="Get pipeline status",
        requires_auth=True,
    )
    
    return router


@pytest.fixture
def generator(router):
    """Create code examples generator."""
    return CodeExamplesGenerator(router, base_url="http://localhost:8000")


def test_generate_python_example(generator, router):
    """Test Python example generation."""
    endpoint = router.get_endpoint("storycore.narration.generate", "POST")
    examples = generator.generate_examples_for_endpoint(endpoint)
    
    # Find Python example
    python_example = next(ex for ex in examples if ex.language == "Python")
    
    assert python_example is not None
    assert "import requests" in python_example.code
    assert "storycore.narration.generate" in python_example.code
    assert "response.json()" in python_example.code


def test_generate_javascript_example(generator, router):
    """Test JavaScript example generation."""
    endpoint = router.get_endpoint("storycore.narration.generate", "POST")
    examples = generator.generate_examples_for_endpoint(endpoint)
    
    # Find JavaScript example
    js_example = next(ex for ex in examples if ex.language == "JavaScript")
    
    assert js_example is not None
    assert "fetch" in js_example.code
    assert "storycore.narration.generate" in js_example.code
    assert "await" in js_example.code


def test_generate_curl_example(generator, router):
    """Test cURL example generation."""
    endpoint = router.get_endpoint("storycore.narration.generate", "POST")
    examples = generator.generate_examples_for_endpoint(endpoint)
    
    # Find cURL example
    curl_example = next(ex for ex in examples if ex.language == "cURL")
    
    assert curl_example is not None
    assert "curl -X POST" in curl_example.code
    assert "storycore.narration.generate" in curl_example.code
    assert "-H" in curl_example.code


def test_async_endpoint_example(generator, router):
    """Test example generation for async endpoint."""
    endpoint = router.get_endpoint("storycore.image.generate", "POST")
    examples = generator.generate_examples_for_endpoint(endpoint)
    
    # Check Python example includes async handling
    python_example = next(ex for ex in examples if ex.language == "Python")
    assert "task_id" in python_example.code
    assert "storycore.task.status" in python_example.code
    assert "while True:" in python_example.code


def test_auth_endpoint_example(generator, router):
    """Test example generation for authenticated endpoint."""
    endpoint = router.get_endpoint("storycore.pipeline.status", "GET")
    examples = generator.generate_examples_for_endpoint(endpoint)
    
    # Check all examples include authentication
    for example in examples:
        assert "Authorization" in example.code or "Bearer" in example.code


def test_generate_all_examples(generator):
    """Test generating examples for all endpoints."""
    all_examples = generator.generate_all_examples()
    
    assert len(all_examples) == 3  # We registered 3 endpoints
    assert "storycore.narration.generate" in all_examples
    assert "storycore.image.generate" in all_examples
    assert "storycore.pipeline.status" in all_examples
    
    # Each endpoint should have 3 examples (Python, JavaScript, cURL)
    for examples in all_examples.values():
        assert len(examples) == 3


def test_generate_examples_for_category(generator):
    """Test generating examples for a specific category."""
    narration_examples = generator.generate_examples_for_category("narration")
    
    assert len(narration_examples) == 1
    assert "storycore.narration.generate" in narration_examples


def test_export_examples_json(generator, tmp_path):
    """Test exporting examples to JSON."""
    output_path = tmp_path / "examples.json"
    generator.export_examples_json(str(output_path))
    
    assert output_path.exists()
    
    # Verify JSON is valid
    import json
    with open(output_path) as f:
        data = json.load(f)
    
    assert isinstance(data, dict)
    assert len(data) > 0


def test_export_examples_markdown(generator, tmp_path):
    """Test exporting examples to Markdown."""
    output_path = tmp_path / "examples.md"
    generator.export_examples_markdown(str(output_path))
    
    assert output_path.exists()
    
    # Verify markdown content
    with open(output_path) as f:
        content = f.read()
    
    assert "# StoryCore API Code Examples" in content
    assert "## Narration" in content
    assert "```python" in content
    assert "```javascript" in content
    assert "```bash" in content


def test_custom_params(generator, router):
    """Test generating examples with custom parameters."""
    endpoint = router.get_endpoint("storycore.narration.generate", "POST")
    custom_params = {
        "prompt": "Custom prompt text",
        "options": {"custom": "value"}
    }
    
    examples = generator.generate_examples_for_endpoint(endpoint, custom_params)
    
    # Check that custom params are used
    python_example = next(ex for ex in examples if ex.language == "Python")
    assert "Custom prompt text" in python_example.code
