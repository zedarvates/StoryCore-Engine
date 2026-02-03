"""
Integration tests for Prompt Engineering API endpoints.

Tests all 10 prompt engineering endpoints with realistic scenarios.
"""

import pytest
import uuid
from datetime import datetime

from src.api.config import APIConfig
from src.api.router import APIRouter
from src.api.models import RequestContext
from src.api.categories.prompt import PromptCategoryHandler
from src.api.categories.narration_models import LLMConfig


@pytest.fixture
def api_config():
    """Create test API configuration."""
    return APIConfig(
        version="v1",
        log_api_calls=True,
        log_sanitize_params=True,
    )


@pytest.fixture
def router(api_config):
    """Create test router."""
    return APIRouter(api_config)


@pytest.fixture
def llm_config():
    """Create test LLM configuration."""
    return LLMConfig(provider="mock")


@pytest.fixture
def handler(api_config, router, llm_config):
    """Create prompt handler."""
    return PromptCategoryHandler(api_config, router, llm_config)


@pytest.fixture
def context():
    """Create test request context."""
    return RequestContext(
        request_id=str(uuid.uuid4()),
        user=None,
    )


class TestPromptCRUD:
    """Test prompt template CRUD operations."""
    
    def test_create_prompt_template(self, handler, context):
        """Test creating a new prompt template."""
        params = {
            "name": "Story Generator",
            "description": "Generate a short story",
            "template": "Write a {genre} story about {topic} in {length} words.",
            "category": "generation",
            "tags": ["story", "creative"],
        }
        
        response = handler.create(params, context)
        
        assert response.status == "success"
        assert response.data["name"] == "Story Generator"
        assert response.data["description"] == "Generate a short story"
        assert len(response.data["variables"]) == 3
        assert "genre" in response.data["variables"]
        assert "topic" in response.data["variables"]
        assert "length" in response.data["variables"]
        assert response.data["category"] == "generation"
        assert "story" in response.data["tags"]
    
    def test_create_duplicate_id_fails(self, handler, context):
        """Test that creating a template with duplicate ID fails."""
        params = {
            "id": "test-id",
            "name": "Test Template",
            "template": "Test {variable}",
        }
        
        # First creation should succeed
        response1 = handler.create(params, context)
        assert response1.status == "success"
        
        # Second creation with same ID should fail
        response2 = handler.create(params, context)
        assert response2.status == "error"
        assert response2.error.code == "CONFLICT"
    
    def test_list_prompt_templates(self, handler, context):
        """Test listing all prompt templates."""
        # Create some templates
        for i in range(3):
            params = {
                "name": f"Template {i}",
                "template": f"Test {{var{i}}}",
                "category": "test" if i % 2 == 0 else "other",
            }
            handler.create(params, context)
        
        # List all templates
        response = handler.list({}, context)
        
        assert response.status == "success"
        assert response.data["total_count"] >= 3
        assert len(response.data["templates"]) >= 3
    
    def test_list_with_category_filter(self, handler, context):
        """Test listing templates with category filter."""
        # Create templates with different categories
        handler.create({
            "name": "Test 1",
            "template": "Test {var}",
            "category": "generation",
        }, context)
        
        handler.create({
            "name": "Test 2",
            "template": "Test {var}",
            "category": "analysis",
        }, context)
        
        # Filter by category
        response = handler.list({"category": "generation"}, context)
        
        assert response.status == "success"
        for template in response.data["templates"]:
            assert template["category"] == "generation"
    
    def test_get_prompt_template(self, handler, context):
        """Test getting a specific prompt template."""
        # Create a template
        create_response = handler.create({
            "name": "Test Template",
            "template": "Test {variable}",
        }, context)
        
        template_id = create_response.data["id"]
        
        # Get the template
        response = handler.get({"id": template_id}, context)
        
        assert response.status == "success"
        assert response.data["id"] == template_id
        assert response.data["name"] == "Test Template"
        assert response.data["template"] == "Test {variable}"
    
    def test_get_nonexistent_template_fails(self, handler, context):
        """Test that getting a nonexistent template fails."""
        response = handler.get({"id": "nonexistent-id"}, context)
        
        assert response.status == "error"
        assert response.error.code == "NOT_FOUND"
    
    def test_update_prompt_template(self, handler, context):
        """Test updating a prompt template."""
        # Create a template
        create_response = handler.create({
            "name": "Original Name",
            "template": "Original {template}",
        }, context)
        
        template_id = create_response.data["id"]
        
        # Update the template
        response = handler.update({
            "id": template_id,
            "name": "Updated Name",
            "description": "New description",
            "template": "Updated {template} with {more} variables",
        }, context)
        
        assert response.status == "success"
        assert response.data["name"] == "Updated Name"
        assert response.data["description"] == "New description"
        assert len(response.data["variables"]) == 2
        assert "template" in response.data["variables"]
        assert "more" in response.data["variables"]
    
    def test_update_nonexistent_template_fails(self, handler, context):
        """Test that updating a nonexistent template fails."""
        response = handler.update({
            "id": "nonexistent-id",
            "name": "New Name",
        }, context)
        
        assert response.status == "error"
        assert response.error.code == "NOT_FOUND"
    
    def test_delete_prompt_template(self, handler, context):
        """Test deleting a prompt template."""
        # Create a template
        create_response = handler.create({
            "name": "To Delete",
            "template": "Test {variable}",
        }, context)
        
        template_id = create_response.data["id"]
        
        # Delete the template
        response = handler.delete({"id": template_id}, context)
        
        assert response.status == "success"
        assert response.data["deleted"] is True
        
        # Verify it's gone
        get_response = handler.get({"id": template_id}, context)
        assert get_response.status == "error"
        assert get_response.error.code == "NOT_FOUND"
    
    def test_delete_nonexistent_template_fails(self, handler, context):
        """Test that deleting a nonexistent template fails."""
        response = handler.delete({"id": "nonexistent-id"}, context)
        
        assert response.status == "error"
        assert response.error.code == "NOT_FOUND"


class TestPromptExecution:
    """Test prompt execution and optimization."""
    
    def test_test_prompt_with_inline_template(self, handler, context):
        """Test executing an inline prompt template."""
        params = {
            "template": "Write a {genre} story about {topic}.",
            "inputs": {
                "genre": "science fiction",
                "topic": "time travel",
            }
        }
        
        response = handler.test(params, context)
        
        assert response.status == "success"
        assert response.data["success"] is True
        assert "output" in response.data
        assert response.data["filled_prompt"] == "Write a science fiction story about time travel."
    
    def test_test_prompt_with_template_id(self, handler, context):
        """Test executing a stored prompt template."""
        # Create a template
        create_response = handler.create({
            "name": "Story Template",
            "template": "Write a {genre} story about {topic}.",
        }, context)
        
        template_id = create_response.data["id"]
        
        # Test the template
        params = {
            "template": template_id,
            "inputs": {
                "genre": "fantasy",
                "topic": "dragons",
            }
        }
        
        response = handler.test(params, context)
        
        assert response.status == "success"
        assert response.data["template_id"] == template_id
        assert response.data["filled_prompt"] == "Write a fantasy story about dragons."
    
    def test_optimize_prompt(self, handler, context):
        """Test optimizing a prompt template."""
        params = {
            "template": "Write a story.",
        }
        
        response = handler.optimize(params, context)
        
        assert response.status == "success"
        assert "optimized_template" in response.data
        assert "improvements" in response.data
    
    def test_optimize_stored_template(self, handler, context):
        """Test optimizing a stored template."""
        # Create a template
        create_response = handler.create({
            "name": "Simple Template",
            "template": "Write a story.",
        }, context)
        
        template_id = create_response.data["id"]
        
        # Optimize it
        response = handler.optimize({"template": template_id}, context)
        
        assert response.status == "success"
        assert "optimized_template" in response.data
    
    def test_extract_variables(self, handler, context):
        """Test extracting variables from a template."""
        params = {
            "template": "Write a {genre} story about {topic} with {character_count} characters.",
        }
        
        response = handler.variables_extract(params, context)
        
        assert response.status == "success"
        assert response.data["variable_count"] == 3
        assert "genre" in response.data["variables"]
        assert "topic" in response.data["variables"]
        assert "character_count" in response.data["variables"]
        assert len(response.data["variable_details"]) == 3
    
    def test_extract_variables_multiple_formats(self, handler, context):
        """Test extracting variables in different formats."""
        params = {
            "template": "Test {var1} and {{var2}} and ${var3}",
        }
        
        response = handler.variables_extract(params, context)
        
        assert response.status == "success"
        assert response.data["variable_count"] == 3
        assert "var1" in response.data["variables"]
        assert "var2" in response.data["variables"]
        assert "var3" in response.data["variables"]


class TestPromptChaining:
    """Test prompt chaining functionality."""
    
    def test_create_prompt_chain(self, handler, context):
        """Test creating a prompt chain."""
        # Create templates for the chain
        template1 = handler.create({
            "name": "Generate Idea",
            "template": "Generate a {genre} story idea.",
        }, context)
        
        template2 = handler.create({
            "name": "Expand Idea",
            "template": "Expand this idea: {idea}",
        }, context)
        
        # Create chain
        params = {
            "name": "Story Development Chain",
            "description": "Generate and expand a story idea",
            "steps": [
                {
                    "template_id": template1.data["id"],
                    "inputs": {},
                    "output_mapping": {"output": "idea"},
                },
                {
                    "template_id": template2.data["id"],
                    "inputs": {},
                    "output_mapping": {},
                },
            ],
        }
        
        response = handler.chain_create(params, context)
        
        assert response.status == "success"
        assert response.data["name"] == "Story Development Chain"
        assert response.data["step_count"] == 2
    
    def test_create_chain_with_duplicate_id_fails(self, handler, context):
        """Test that creating a chain with duplicate ID fails."""
        # Create a template first
        template = handler.create({
            "name": "Test",
            "template": "Test {var}",
        }, context)
        
        params = {
            "id": "test-chain",
            "name": "Test Chain",
            "steps": [{"template_id": template.data["id"]}],
        }
        
        # First creation should succeed
        response1 = handler.chain_create(params, context)
        assert response1.status == "success"
        
        # Second creation with same ID should fail
        response2 = handler.chain_create(params, context)
        assert response2.status == "error"
        assert response2.error.code == "CONFLICT"
    
    def test_create_chain_with_empty_steps_fails(self, handler, context):
        """Test that creating a chain with no steps fails."""
        params = {
            "name": "Empty Chain",
            "steps": [],
        }
        
        response = handler.chain_create(params, context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_execute_prompt_chain(self, handler, context):
        """Test executing a prompt chain."""
        # Create templates
        template1 = handler.create({
            "name": "Step 1",
            "template": "Generate a {genre} story idea.",
        }, context)
        
        template2 = handler.create({
            "name": "Step 2",
            "template": "Expand this idea: {idea}",
        }, context)
        
        # Create chain
        chain_response = handler.chain_create({
            "name": "Test Chain",
            "steps": [
                {
                    "template_id": template1.data["id"],
                    "inputs": {},
                    "output_mapping": {"output": "idea"},
                },
                {
                    "template_id": template2.data["id"],
                    "inputs": {},
                    "output_mapping": {},
                },
            ],
        }, context)
        
        chain_id = chain_response.data["id"]
        
        # Execute chain
        response = handler.chain_execute({
            "chain_id": chain_id,
            "inputs": {"genre": "fantasy"},
        }, context)
        
        assert response.status == "success"
        assert response.data["success"] is True
        assert response.data["steps_executed"] == 2
        assert len(response.data["step_results"]) == 2
        assert "final_output" in response.data
    
    def test_execute_nonexistent_chain_fails(self, handler, context):
        """Test that executing a nonexistent chain fails."""
        response = handler.chain_execute({
            "chain_id": "nonexistent-chain",
        }, context)
        
        assert response.status == "error"
        assert response.error.code == "NOT_FOUND"
    
    def test_execute_chain_with_invalid_template_fails(self, handler, context):
        """Test that executing a chain with invalid template fails."""
        # Create chain with invalid template ID
        chain_response = handler.chain_create({
            "name": "Invalid Chain",
            "steps": [
                {
                    "template_id": "nonexistent-template",
                    "inputs": {},
                },
            ],
        }, context)
        
        chain_id = chain_response.data["id"]
        
        # Execute chain should fail
        response = handler.chain_execute({
            "chain_id": chain_id,
        }, context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"


class TestPromptValidation:
    """Test parameter validation."""
    
    def test_create_without_name_fails(self, handler, context):
        """Test that creating without name fails."""
        response = handler.create({
            "template": "Test {var}",
        }, context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
        assert "name" in response.error.details["missing_fields"]
    
    def test_create_without_template_fails(self, handler, context):
        """Test that creating without template fails."""
        response = handler.create({
            "name": "Test",
        }, context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
        assert "template" in response.error.details["missing_fields"]
    
    def test_get_without_id_fails(self, handler, context):
        """Test that getting without ID fails."""
        response = handler.get({}, context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_test_without_template_fails(self, handler, context):
        """Test that testing without template fails."""
        response = handler.test({
            "inputs": {"var": "value"},
        }, context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_test_without_inputs_fails(self, handler, context):
        """Test that testing without inputs fails."""
        response = handler.test({
            "template": "Test {var}",
        }, context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"


class TestPromptMetadata:
    """Test metadata handling."""
    
    def test_response_includes_metadata(self, handler, context):
        """Test that all responses include proper metadata."""
        response = handler.list({}, context)
        
        assert response.metadata is not None
        assert response.metadata.request_id == context.request_id
        assert response.metadata.api_version == "v1"
        assert response.metadata.timestamp is not None
        assert response.metadata.duration_ms >= 0
    
    def test_template_includes_timestamps(self, handler, context):
        """Test that templates include creation and update timestamps."""
        response = handler.create({
            "name": "Test",
            "template": "Test {var}",
        }, context)
        
        assert response.data["created_at"] is not None
        
        # Update and check updated_at
        template_id = response.data["id"]
        update_response = handler.update({
            "id": template_id,
            "name": "Updated",
        }, context)
        
        assert update_response.data["updated_at"] is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
