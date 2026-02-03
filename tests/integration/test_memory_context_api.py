"""
Integration tests for Memory and Context API endpoints.

Tests all 8 memory and context endpoints with real API calls.
"""

import pytest
import sys
from pathlib import Path
from datetime import datetime

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from api.router import APIRouter
from api.config import APIConfig
from api.models import RequestContext
from api.categories.memory import MemoryCategoryHandler


@pytest.fixture
def api_config():
    """Create test API configuration."""
    return APIConfig(
        version="v1",
        host="localhost",
        port=8000,
        enable_auth=False,
        enable_rate_limiting=False,
        log_api_calls=True,
    )


@pytest.fixture
def router(api_config):
    """Create API router."""
    return APIRouter(api_config)


@pytest.fixture
def memory_handler(api_config, router):
    """Create memory category handler."""
    return MemoryCategoryHandler(api_config, router)


@pytest.fixture
def request_context():
    """Create test request context."""
    return RequestContext(
        request_id="test-request-001",
        user=None,
    )


@pytest.fixture
def test_project_name():
    """Test project name."""
    return "test-memory-project"


class TestMemoryEndpoints:
    """Test memory management endpoints."""
    
    def test_store_and_retrieve_memory(self, memory_handler, request_context, test_project_name):
        """Test storing and retrieving memory."""
        # Store memory
        store_params = {
            "project_name": test_project_name,
            "key": "test_key",
            "value": "test_value",
            "metadata": {"type": "test"},
            "tags": ["test", "integration"],
        }
        
        store_response = memory_handler.store_memory(store_params, request_context)
        
        assert store_response.status == "success"
        assert store_response.data["key"] == "test_key"
        assert store_response.data["value"] == "test_value"
        assert store_response.data["created"] is True
        
        # Retrieve memory
        retrieve_params = {
            "project_name": test_project_name,
            "key": "test_key",
        }
        
        retrieve_response = memory_handler.retrieve_memory(retrieve_params, request_context)
        
        assert retrieve_response.status == "success"
        assert retrieve_response.data["key"] == "test_key"
        assert retrieve_response.data["value"] == "test_value"
        assert retrieve_response.data["found"] is True
        assert retrieve_response.data["metadata"]["type"] == "test"
        assert "test" in retrieve_response.data["tags"]
    
    def test_retrieve_nonexistent_key(self, memory_handler, request_context, test_project_name):
        """Test retrieving a nonexistent key."""
        retrieve_params = {
            "project_name": test_project_name,
            "key": "nonexistent_key",
        }
        
        retrieve_response = memory_handler.retrieve_memory(retrieve_params, request_context)
        
        assert retrieve_response.status == "success"
        assert retrieve_response.data["found"] is False
        assert retrieve_response.data["value"] is None
    
    def test_retrieve_with_default(self, memory_handler, request_context, test_project_name):
        """Test retrieving with default value."""
        retrieve_params = {
            "project_name": test_project_name,
            "key": "nonexistent_key",
            "default": "default_value",
        }
        
        retrieve_response = memory_handler.retrieve_memory(retrieve_params, request_context)
        
        assert retrieve_response.status == "success"
        assert retrieve_response.data["found"] is False
        assert retrieve_response.data["value"] == "default_value"
        assert retrieve_response.data["default_used"] is True
    
    def test_store_overwrite(self, memory_handler, request_context, test_project_name):
        """Test overwriting existing memory."""
        # Store initial value
        store_params = {
            "project_name": test_project_name,
            "key": "overwrite_key",
            "value": "initial_value",
        }
        
        store_response1 = memory_handler.store_memory(store_params, request_context)
        assert store_response1.data["created"] is True
        
        # Overwrite with new value
        store_params["value"] = "new_value"
        store_response2 = memory_handler.store_memory(store_params, request_context)
        
        assert store_response2.status == "success"
        assert store_response2.data["created"] is False
        assert store_response2.data["value"] == "new_value"
        
        # Verify new value is stored
        retrieve_params = {
            "project_name": test_project_name,
            "key": "overwrite_key",
        }
        
        retrieve_response = memory_handler.retrieve_memory(retrieve_params, request_context)
        assert retrieve_response.data["value"] == "new_value"
    
    def test_store_no_overwrite(self, memory_handler, request_context, test_project_name):
        """Test preventing overwrite of existing memory."""
        # Store initial value
        store_params = {
            "project_name": test_project_name,
            "key": "no_overwrite_key",
            "value": "initial_value",
        }
        
        memory_handler.store_memory(store_params, request_context)
        
        # Try to store without overwrite
        store_params["value"] = "new_value"
        store_params["overwrite"] = False
        
        store_response = memory_handler.store_memory(store_params, request_context)
        
        assert store_response.status == "error"
        assert store_response.error.code == "CONFLICT"
    
    def test_search_memory(self, memory_handler, request_context, test_project_name):
        """Test searching memory."""
        # Store multiple items
        items = [
            {"key": "search1", "value": "apple fruit red", "tags": ["fruit"]},
            {"key": "search2", "value": "banana fruit yellow", "tags": ["fruit"]},
            {"key": "search3", "value": "carrot vegetable orange", "tags": ["vegetable"]},
        ]
        
        for item in items:
            store_params = {
                "project_name": test_project_name,
                "key": item["key"],
                "value": item["value"],
                "tags": item["tags"],
            }
            memory_handler.store_memory(store_params, request_context)
        
        # Search for fruit
        search_params = {
            "project_name": test_project_name,
            "query": "fruit",
            "limit": 10,
            "threshold": 0.3,
        }
        
        search_response = memory_handler.search_memory(search_params, request_context)
        
        assert search_response.status == "success"
        assert search_response.data["count"] >= 2
        assert any(r["key"] == "search1" for r in search_response.data["results"])
        assert any(r["key"] == "search2" for r in search_response.data["results"])
    
    def test_search_memory_with_tags(self, memory_handler, request_context, test_project_name):
        """Test searching memory with tag filter."""
        # Store items with tags
        items = [
            {"key": "tag1", "value": "test data", "tags": ["important"]},
            {"key": "tag2", "value": "test data", "tags": ["normal"]},
        ]
        
        for item in items:
            store_params = {
                "project_name": test_project_name,
                "key": item["key"],
                "value": item["value"],
                "tags": item["tags"],
            }
            memory_handler.store_memory(store_params, request_context)
        
        # Search with tag filter
        search_params = {
            "project_name": test_project_name,
            "query": "test",
            "tags": ["important"],
        }
        
        search_response = memory_handler.search_memory(search_params, request_context)
        
        assert search_response.status == "success"
        assert all(r["key"] == "tag1" for r in search_response.data["results"])
    
    def test_clear_specific_keys(self, memory_handler, request_context, test_project_name):
        """Test clearing specific memory keys."""
        # Store multiple items
        for i in range(3):
            store_params = {
                "project_name": test_project_name,
                "key": f"clear_key_{i}",
                "value": f"value_{i}",
            }
            memory_handler.store_memory(store_params, request_context)
        
        # Clear specific keys
        clear_params = {
            "project_name": test_project_name,
            "keys": ["clear_key_0", "clear_key_1"],
        }
        
        clear_response = memory_handler.clear_memory(clear_params, request_context)
        
        assert clear_response.status == "success"
        assert clear_response.data["count"] == 2
        assert "clear_key_0" in clear_response.data["cleared_keys"]
        assert "clear_key_1" in clear_response.data["cleared_keys"]
        
        # Verify keys are cleared
        retrieve_params = {
            "project_name": test_project_name,
            "key": "clear_key_0",
        }
        retrieve_response = memory_handler.retrieve_memory(retrieve_params, request_context)
        assert retrieve_response.data["found"] is False
    
    def test_clear_by_tags(self, memory_handler, request_context, test_project_name):
        """Test clearing memory by tags."""
        # Store items with tags
        items = [
            {"key": "tag_clear1", "value": "data", "tags": ["temp"]},
            {"key": "tag_clear2", "value": "data", "tags": ["temp"]},
            {"key": "tag_clear3", "value": "data", "tags": ["permanent"]},
        ]
        
        for item in items:
            store_params = {
                "project_name": test_project_name,
                "key": item["key"],
                "value": item["value"],
                "tags": item["tags"],
            }
            memory_handler.store_memory(store_params, request_context)
        
        # Clear by tag
        clear_params = {
            "project_name": test_project_name,
            "tags": ["temp"],
        }
        
        clear_response = memory_handler.clear_memory(clear_params, request_context)
        
        assert clear_response.status == "success"
        assert clear_response.data["count"] == 2
        
        # Verify permanent tag item still exists
        retrieve_params = {
            "project_name": test_project_name,
            "key": "tag_clear3",
        }
        retrieve_response = memory_handler.retrieve_memory(retrieve_params, request_context)
        assert retrieve_response.data["found"] is True


class TestContextEndpoints:
    """Test context stack endpoints."""
    
    def test_push_and_pop_context(self, memory_handler, request_context, test_project_name):
        """Test pushing and popping context."""
        # Push context
        push_params = {
            "project_name": test_project_name,
            "data": {"scene": "intro", "character": "hero"},
            "source": "test",
        }
        
        push_response = memory_handler.push_context(push_params, request_context)
        
        assert push_response.status == "success"
        assert push_response.data["stack_size"] == 1
        
        # Pop context
        pop_params = {
            "project_name": test_project_name,
        }
        
        pop_response = memory_handler.pop_context(pop_params, request_context)
        
        assert pop_response.status == "success"
        assert pop_response.data["count"] == 1
        assert pop_response.data["popped_items"][0]["data"]["scene"] == "intro"
        assert pop_response.data["remaining_stack_size"] == 0
    
    def test_lifo_context_stack(self, memory_handler, request_context, test_project_name):
        """Test LIFO behavior of context stack."""
        # Push multiple contexts
        contexts = [
            {"data": {"level": 1}},
            {"data": {"level": 2}},
            {"data": {"level": 3}},
        ]
        
        for ctx in contexts:
            push_params = {
                "project_name": test_project_name,
                "data": ctx["data"],
            }
            memory_handler.push_context(push_params, request_context)
        
        # Pop and verify LIFO order
        pop_params = {"project_name": test_project_name}
        
        pop_response1 = memory_handler.pop_context(pop_params, request_context)
        assert pop_response1.data["popped_items"][0]["data"]["level"] == 3
        
        pop_response2 = memory_handler.pop_context(pop_params, request_context)
        assert pop_response2.data["popped_items"][0]["data"]["level"] == 2
        
        pop_response3 = memory_handler.pop_context(pop_params, request_context)
        assert pop_response3.data["popped_items"][0]["data"]["level"] == 1
    
    def test_pop_multiple_contexts(self, memory_handler, request_context, test_project_name):
        """Test popping multiple contexts at once."""
        # Push multiple contexts
        for i in range(5):
            push_params = {
                "project_name": test_project_name,
                "data": {"index": i},
            }
            memory_handler.push_context(push_params, request_context)
        
        # Pop multiple
        pop_params = {
            "project_name": test_project_name,
            "count": 3,
        }
        
        pop_response = memory_handler.pop_context(pop_params, request_context)
        
        assert pop_response.status == "success"
        assert pop_response.data["count"] == 3
        assert pop_response.data["remaining_stack_size"] == 2
        # Verify LIFO order
        assert pop_response.data["popped_items"][0]["data"]["index"] == 4
        assert pop_response.data["popped_items"][1]["data"]["index"] == 3
        assert pop_response.data["popped_items"][2]["data"]["index"] == 2
    
    def test_pop_empty_stack(self, memory_handler, request_context, test_project_name):
        """Test popping from empty stack."""
        pop_params = {
            "project_name": test_project_name,
        }
        
        pop_response = memory_handler.pop_context(pop_params, request_context)
        
        assert pop_response.status == "error"
        assert pop_response.error.code == "CONFLICT"
    
    def test_get_context(self, memory_handler, request_context, test_project_name):
        """Test getting current context."""
        # Push context
        push_params = {
            "project_name": test_project_name,
            "data": {"current": "context"},
        }
        memory_handler.push_context(push_params, request_context)
        
        # Get context
        get_params = {
            "project_name": test_project_name,
        }
        
        get_response = memory_handler.get_context(get_params, request_context)
        
        assert get_response.status == "success"
        assert get_response.data["current_context"]["current"] == "context"
        assert get_response.data["stack_size"] == 1
        assert get_response.data["has_context"] is True
    
    def test_get_context_with_stack(self, memory_handler, request_context, test_project_name):
        """Test getting context with full stack."""
        # Push multiple contexts
        for i in range(3):
            push_params = {
                "project_name": test_project_name,
                "data": {"level": i},
            }
            memory_handler.push_context(push_params, request_context)
        
        # Get context with stack
        get_params = {
            "project_name": test_project_name,
            "include_stack": True,
        }
        
        get_response = memory_handler.get_context(get_params, request_context)
        
        assert get_response.status == "success"
        assert len(get_response.data["stack"]) == 3
        assert get_response.data["current_context"]["level"] == 2  # Top of stack
    
    def test_get_default_context(self, memory_handler, request_context, test_project_name):
        """Test getting default context when stack is empty."""
        get_params = {
            "project_name": test_project_name,
        }
        
        get_response = memory_handler.get_context(get_params, request_context)
        
        assert get_response.status == "success"
        assert get_response.data["has_context"] is False
        assert get_response.data["current_context"]["project_name"] == test_project_name
    
    def test_reset_context(self, memory_handler, request_context, test_project_name):
        """Test resetting context."""
        # Push contexts
        for i in range(3):
            push_params = {
                "project_name": test_project_name,
                "data": {"level": i},
            }
            memory_handler.push_context(push_params, request_context)
        
        # Reset context
        reset_params = {
            "project_name": test_project_name,
        }
        
        reset_response = memory_handler.reset_context(reset_params, request_context)
        
        assert reset_response.status == "success"
        assert reset_response.data["previous_stack_size"] == 3
        assert reset_response.data["current_stack_size"] == 0
        assert reset_response.data["preserved_defaults"] is True
        
        # Verify stack is empty
        get_params = {"project_name": test_project_name}
        get_response = memory_handler.get_context(get_params, request_context)
        assert get_response.data["stack_size"] == 0
    
    def test_reset_context_no_preserve(self, memory_handler, request_context, test_project_name):
        """Test resetting context without preserving defaults."""
        # Push context
        push_params = {
            "project_name": test_project_name,
            "data": {"test": "data"},
        }
        memory_handler.push_context(push_params, request_context)
        
        # Reset without preserving defaults
        reset_params = {
            "project_name": test_project_name,
            "preserve_defaults": False,
        }
        
        reset_response = memory_handler.reset_context(reset_params, request_context)
        
        assert reset_response.status == "success"
        assert reset_response.data["preserved_defaults"] is False


class TestMemoryContextIntegration:
    """Test integration between memory and context."""
    
    def test_memory_and_context_isolation(self, memory_handler, request_context):
        """Test that memory and context are isolated per project."""
        project1 = "project1"
        project2 = "project2"
        
        # Store memory in project1
        store_params = {
            "project_name": project1,
            "key": "shared_key",
            "value": "project1_value",
        }
        memory_handler.store_memory(store_params, request_context)
        
        # Store memory in project2
        store_params["project_name"] = project2
        store_params["value"] = "project2_value"
        memory_handler.store_memory(store_params, request_context)
        
        # Verify isolation
        retrieve_params = {
            "project_name": project1,
            "key": "shared_key",
        }
        response1 = memory_handler.retrieve_memory(retrieve_params, request_context)
        assert response1.data["value"] == "project1_value"
        
        retrieve_params["project_name"] = project2
        response2 = memory_handler.retrieve_memory(retrieve_params, request_context)
        assert response2.data["value"] == "project2_value"
    
    def test_workflow_with_memory_and_context(self, memory_handler, request_context, test_project_name):
        """Test a complete workflow using both memory and context."""
        # Store configuration in memory
        store_params = {
            "project_name": test_project_name,
            "key": "config",
            "value": {"theme": "dark", "language": "en"},
        }
        memory_handler.store_memory(store_params, request_context)
        
        # Push scene context
        push_params = {
            "project_name": test_project_name,
            "data": {"scene": "opening", "mood": "tense"},
        }
        memory_handler.push_context(push_params, request_context)
        
        # Retrieve config from memory
        retrieve_params = {
            "project_name": test_project_name,
            "key": "config",
        }
        config_response = memory_handler.retrieve_memory(retrieve_params, request_context)
        assert config_response.data["value"]["theme"] == "dark"
        
        # Get current context
        get_params = {"project_name": test_project_name}
        context_response = memory_handler.get_context(get_params, request_context)
        assert context_response.data["current_context"]["scene"] == "opening"
        
        # Update scene context
        push_params["data"] = {"scene": "climax", "mood": "intense"}
        memory_handler.push_context(push_params, request_context)
        
        # Verify new context
        context_response = memory_handler.get_context(get_params, request_context)
        assert context_response.data["current_context"]["scene"] == "climax"
        
        # Pop back to previous scene
        pop_params = {"project_name": test_project_name}
        memory_handler.pop_context(pop_params, request_context)
        
        context_response = memory_handler.get_context(get_params, request_context)
        assert context_response.data["current_context"]["scene"] == "opening"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
