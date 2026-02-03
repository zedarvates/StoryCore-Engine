"""
Integration tests for Knowledge API endpoints.

Tests all 7 knowledge endpoints:
- storycore.knowledge.add
- storycore.knowledge.search
- storycore.knowledge.update
- storycore.knowledge.delete
- storycore.knowledge.graph.build
- storycore.knowledge.verify
- storycore.knowledge.export
"""

import pytest
from datetime import datetime

from src.api.config import APIConfig
from src.api.router import APIRouter
from src.api.models import RequestContext
from src.api.categories.knowledge import KnowledgeCategoryHandler


@pytest.fixture
def api_config():
    """Create API configuration for testing."""
    return APIConfig(
        version="1.0.0",
        log_api_calls=True,
        log_sanitize_params=True,
    )


@pytest.fixture
def api_router(api_config):
    """Create API router for testing."""
    return APIRouter(api_config)


@pytest.fixture
def knowledge_handler(api_config, api_router):
    """Create knowledge handler for testing."""
    return KnowledgeCategoryHandler(api_config, api_router)


@pytest.fixture
def request_context():
    """Create request context for testing."""
    return RequestContext()


@pytest.fixture
def sample_knowledge_items():
    """Create sample knowledge items for testing."""
    return [
        {
            "content": "Python is a high-level programming language",
            "knowledge_type": "fact",
            "tags": ["programming", "python"],
            "confidence": 1.0,
        },
        {
            "content": "Functions are reusable blocks of code",
            "knowledge_type": "concept",
            "tags": ["programming", "functions"],
            "confidence": 0.9,
        },
        {
            "content": "Always validate user input to prevent security vulnerabilities",
            "knowledge_type": "rule",
            "tags": ["security", "best-practices"],
            "confidence": 1.0,
        },
    ]



class TestKnowledgeAddEndpoint:
    """Tests for storycore.knowledge.add endpoint."""
    
    def test_knowledge_add_basic(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test adding knowledge items."""
        params = {"items": sample_knowledge_items}
        
        response = knowledge_handler.knowledge_add(params, request_context)
        
        assert response.status == "success"
        assert response.data["added_count"] == 3
        assert len(response.data["items"]) == 3
        assert response.data["add_time_ms"] >= 0
    
    def test_knowledge_add_with_auto_link(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test adding knowledge items with auto-linking."""
        params = {
            "items": sample_knowledge_items,
            "auto_link": True,
        }
        
        response = knowledge_handler.knowledge_add(params, request_context)
        
        assert response.status == "success"
        assert response.data["added_count"] == 3
        # Auto-linking may create relationships
        assert "auto_linked_count" in response.data
    
    def test_knowledge_add_without_auto_link(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test adding knowledge items without auto-linking."""
        params = {
            "items": sample_knowledge_items,
            "auto_link": False,
        }
        
        response = knowledge_handler.knowledge_add(params, request_context)
        
        assert response.status == "success"
        assert response.data["added_count"] == 3
        assert response.data["auto_linked_count"] == 0
    
    def test_knowledge_add_with_custom_id(self, knowledge_handler, request_context):
        """Test adding knowledge item with custom ID."""
        params = {
            "items": [
                {
                    "id": "custom_id_001",
                    "content": "Custom ID test",
                    "knowledge_type": "fact",
                }
            ]
        }
        
        response = knowledge_handler.knowledge_add(params, request_context)
        
        assert response.status == "success"
        assert response.data["items"][0]["id"] == "custom_id_001"
    
    def test_knowledge_add_missing_items(self, knowledge_handler, request_context):
        """Test adding knowledge without items parameter."""
        params = {}
        
        response = knowledge_handler.knowledge_add(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_knowledge_add_empty_items(self, knowledge_handler, request_context):
        """Test adding empty items list."""
        params = {"items": []}
        
        response = knowledge_handler.knowledge_add(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_knowledge_add_invalid_items_type(self, knowledge_handler, request_context):
        """Test adding knowledge with invalid items type."""
        params = {"items": "not a list"}
        
        response = knowledge_handler.knowledge_add(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_knowledge_add_missing_content(self, knowledge_handler, request_context):
        """Test adding knowledge item without content."""
        params = {
            "items": [
                {"knowledge_type": "fact"}
            ]
        }
        
        response = knowledge_handler.knowledge_add(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_knowledge_add_invalid_knowledge_type(self, knowledge_handler, request_context):
        """Test adding knowledge with invalid type."""
        params = {
            "items": [
                {
                    "content": "Test content",
                    "knowledge_type": "invalid_type",
                }
            ]
        }
        
        response = knowledge_handler.knowledge_add(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"



class TestKnowledgeSearchEndpoint:
    """Tests for storycore.knowledge.search endpoint."""
    
    def test_knowledge_search_basic(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test basic knowledge search."""
        # Add items first
        knowledge_handler.knowledge_add({"items": sample_knowledge_items}, request_context)
        
        # Search
        params = {"query": "programming"}
        response = knowledge_handler.knowledge_search(params, request_context)
        
        assert response.status == "success"
        assert response.data["query"] == "programming"
        assert response.data["total_count"] > 0
        assert len(response.data["results"]) > 0
        assert response.data["search_time_ms"] >= 0
    
    def test_knowledge_search_with_filters(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test knowledge search with type and tag filters."""
        # Add items first
        knowledge_handler.knowledge_add({"items": sample_knowledge_items}, request_context)
        
        # Search with filters
        params = {
            "query": "programming",
            "knowledge_types": ["fact"],
            "tags": ["python"],
            "max_results": 5,
        }
        response = knowledge_handler.knowledge_search(params, request_context)
        
        assert response.status == "success"
        assert response.data["total_count"] >= 0
    
    def test_knowledge_search_semantic(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test semantic search."""
        # Add items first
        knowledge_handler.knowledge_add({"items": sample_knowledge_items}, request_context)
        
        # Semantic search
        params = {
            "query": "code functions",
            "semantic_search": True,
        }
        response = knowledge_handler.knowledge_search(params, request_context)
        
        assert response.status == "success"
    
    def test_knowledge_search_non_semantic(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test non-semantic (substring) search."""
        # Add items first
        knowledge_handler.knowledge_add({"items": sample_knowledge_items}, request_context)
        
        # Non-semantic search
        params = {
            "query": "Python",
            "semantic_search": False,
        }
        response = knowledge_handler.knowledge_search(params, request_context)
        
        assert response.status == "success"
    
    def test_knowledge_search_with_confidence_filter(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test search with minimum confidence filter."""
        # Add items first
        knowledge_handler.knowledge_add({"items": sample_knowledge_items}, request_context)
        
        # Search with confidence filter
        params = {
            "query": "programming",
            "min_confidence": 0.95,
        }
        response = knowledge_handler.knowledge_search(params, request_context)
        
        assert response.status == "success"
        # Should only return items with confidence >= 0.95
        for item in response.data["results"]:
            assert item["confidence"] >= 0.95
    
    def test_knowledge_search_missing_query(self, knowledge_handler, request_context):
        """Test search without query parameter."""
        params = {}
        
        response = knowledge_handler.knowledge_search(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_knowledge_search_empty_query(self, knowledge_handler, request_context):
        """Test search with empty query."""
        params = {"query": "   "}
        
        response = knowledge_handler.knowledge_search(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_knowledge_search_invalid_max_results(self, knowledge_handler, request_context):
        """Test search with invalid max_results."""
        params = {
            "query": "test",
            "max_results": 200,
        }
        
        response = knowledge_handler.knowledge_search(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_knowledge_search_invalid_knowledge_type(self, knowledge_handler, request_context):
        """Test search with invalid knowledge type filter."""
        params = {
            "query": "test",
            "knowledge_types": ["invalid_type"],
        }
        
        response = knowledge_handler.knowledge_search(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"




class TestKnowledgeUpdateEndpoint:
    """Tests for storycore.knowledge.update endpoint."""
    
    def test_knowledge_update_basic(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test updating knowledge item."""
        # Add items first
        add_response = knowledge_handler.knowledge_add({"items": sample_knowledge_items}, request_context)
        item_id = add_response.data["items"][0]["id"]
        
        # Update item
        params = {
            "item_id": item_id,
            "updates": {
                "content": "Updated content",
                "confidence": 0.8,
            }
        }
        response = knowledge_handler.knowledge_update(params, request_context)
        
        assert response.status == "success"
        assert response.data["updated"] is True
        assert response.data["item"]["content"] == "Updated content"
        assert response.data["item"]["confidence"] == 0.8
        assert response.data["update_time_ms"] >= 0
    
    def test_knowledge_update_tags(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test updating knowledge item tags."""
        # Add items first
        add_response = knowledge_handler.knowledge_add({"items": sample_knowledge_items}, request_context)
        item_id = add_response.data["items"][0]["id"]
        
        # Update tags
        params = {
            "item_id": item_id,
            "updates": {
                "tags": ["new-tag", "updated"],
            }
        }
        response = knowledge_handler.knowledge_update(params, request_context)
        
        assert response.status == "success"
        assert response.data["updated"] is True
        assert "new-tag" in response.data["item"]["tags"]
    
    def test_knowledge_update_knowledge_type(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test updating knowledge type."""
        # Add items first
        add_response = knowledge_handler.knowledge_add({"items": sample_knowledge_items}, request_context)
        item_id = add_response.data["items"][0]["id"]
        
        # Update knowledge type
        params = {
            "item_id": item_id,
            "updates": {
                "knowledge_type": "concept",
            }
        }
        response = knowledge_handler.knowledge_update(params, request_context)
        
        assert response.status == "success"
        assert response.data["updated"] is True
        assert response.data["item"]["knowledge_type"] == "concept"
    
    def test_knowledge_update_nonexistent_item(self, knowledge_handler, request_context):
        """Test updating nonexistent knowledge item."""
        params = {
            "item_id": "nonexistent_id",
            "updates": {"content": "New content"}
        }
        
        response = knowledge_handler.knowledge_update(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "NOT_FOUND"
    
    def test_knowledge_update_missing_item_id(self, knowledge_handler, request_context):
        """Test update without item_id parameter."""
        params = {"updates": {"content": "New content"}}
        
        response = knowledge_handler.knowledge_update(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_knowledge_update_missing_updates(self, knowledge_handler, request_context):
        """Test update without updates parameter."""
        params = {"item_id": "test_id"}
        
        response = knowledge_handler.knowledge_update(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_knowledge_update_empty_updates(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test update with empty updates dictionary."""
        # Add items first
        add_response = knowledge_handler.knowledge_add({"items": sample_knowledge_items}, request_context)
        item_id = add_response.data["items"][0]["id"]
        
        params = {
            "item_id": item_id,
            "updates": {}
        }
        
        response = knowledge_handler.knowledge_update(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_knowledge_update_invalid_knowledge_type(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test update with invalid knowledge type."""
        # Add items first
        add_response = knowledge_handler.knowledge_add({"items": sample_knowledge_items}, request_context)
        item_id = add_response.data["items"][0]["id"]
        
        params = {
            "item_id": item_id,
            "updates": {"knowledge_type": "invalid_type"}
        }
        
        response = knowledge_handler.knowledge_update(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_knowledge_update_invalid_confidence(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test update with invalid confidence value."""
        # Add items first
        add_response = knowledge_handler.knowledge_add({"items": sample_knowledge_items}, request_context)
        item_id = add_response.data["items"][0]["id"]
        
        params = {
            "item_id": item_id,
            "updates": {"confidence": 1.5}
        }
        
        response = knowledge_handler.knowledge_update(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"




class TestKnowledgeDeleteEndpoint:
    """Tests for storycore.knowledge.delete endpoint."""
    
    def test_knowledge_delete_basic(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test deleting knowledge items."""
        # Add items first
        add_response = knowledge_handler.knowledge_add({"items": sample_knowledge_items}, request_context)
        item_ids = [item["id"] for item in add_response.data["items"]]
        
        # Delete items
        params = {"item_ids": item_ids[:2]}
        response = knowledge_handler.knowledge_delete(params, request_context)
        
        assert response.status == "success"
        assert response.data["deleted_count"] == 2
        assert len(response.data["deleted_ids"]) == 2
        assert response.data["delete_time_ms"] >= 0
    
    def test_knowledge_delete_single_item(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test deleting single knowledge item."""
        # Add items first
        add_response = knowledge_handler.knowledge_add({"items": sample_knowledge_items}, request_context)
        item_id = add_response.data["items"][0]["id"]
        
        # Delete item
        params = {"item_ids": [item_id]}
        response = knowledge_handler.knowledge_delete(params, request_context)
        
        assert response.status == "success"
        assert response.data["deleted_count"] == 1
        assert item_id in response.data["deleted_ids"]
    
    def test_knowledge_delete_with_cascade(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test deleting knowledge items with cascade."""
        # Add items first
        add_response = knowledge_handler.knowledge_add({"items": sample_knowledge_items}, request_context)
        item_ids = [item["id"] for item in add_response.data["items"]]
        
        # Delete with cascade
        params = {
            "item_ids": [item_ids[0]],
            "cascade": True,
        }
        response = knowledge_handler.knowledge_delete(params, request_context)
        
        assert response.status == "success"
        assert response.data["deleted_count"] >= 1
        assert "cascaded_count" in response.data
    
    def test_knowledge_delete_nonexistent_items(self, knowledge_handler, request_context):
        """Test deleting nonexistent knowledge items."""
        params = {"item_ids": ["nonexistent_1", "nonexistent_2"]}
        
        response = knowledge_handler.knowledge_delete(params, request_context)
        
        assert response.status == "success"
        assert response.data["deleted_count"] == 0
    
    def test_knowledge_delete_missing_item_ids(self, knowledge_handler, request_context):
        """Test delete without item_ids parameter."""
        params = {}
        
        response = knowledge_handler.knowledge_delete(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_knowledge_delete_empty_item_ids(self, knowledge_handler, request_context):
        """Test delete with empty item_ids list."""
        params = {"item_ids": []}
        
        response = knowledge_handler.knowledge_delete(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_knowledge_delete_invalid_item_ids_type(self, knowledge_handler, request_context):
        """Test delete with invalid item_ids type."""
        params = {"item_ids": "not a list"}
        
        response = knowledge_handler.knowledge_delete(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"




class TestKnowledgeGraphBuildEndpoint:
    """Tests for storycore.knowledge.graph.build endpoint."""
    
    def test_knowledge_graph_build_all_items(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test building knowledge graph from all items."""
        # Add items first
        knowledge_handler.knowledge_add({"items": sample_knowledge_items}, request_context)
        
        # Build graph
        params = {}
        response = knowledge_handler.knowledge_graph_build(params, request_context)
        
        assert response.status == "success"
        assert "graph" in response.data
        assert response.data["item_count"] == 3
        assert "relationship_count" in response.data
        assert response.data["build_time_ms"] >= 0
    
    def test_knowledge_graph_build_specific_items(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test building knowledge graph from specific items."""
        # Add items first
        add_response = knowledge_handler.knowledge_add({"items": sample_knowledge_items}, request_context)
        item_ids = [item["id"] for item in add_response.data["items"][:2]]
        
        # Build graph for specific items
        params = {"item_ids": item_ids}
        response = knowledge_handler.knowledge_graph_build(params, request_context)
        
        assert response.status == "success"
        assert response.data["item_count"] == 2
    
    def test_knowledge_graph_build_without_relationships(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test building knowledge graph without relationships."""
        # Add items first
        knowledge_handler.knowledge_add({"items": sample_knowledge_items}, request_context)
        
        # Build graph without relationships
        params = {"include_relationships": False}
        response = knowledge_handler.knowledge_graph_build(params, request_context)
        
        assert response.status == "success"
        assert response.data["relationship_count"] == 0
    
    def test_knowledge_graph_build_with_max_depth(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test building knowledge graph with max depth."""
        # Add items first
        knowledge_handler.knowledge_add({"items": sample_knowledge_items}, request_context)
        
        # Build graph with max depth
        params = {"max_depth": 2}
        response = knowledge_handler.knowledge_graph_build(params, request_context)
        
        assert response.status == "success"
    
    def test_knowledge_graph_build_invalid_max_depth(self, knowledge_handler, request_context):
        """Test building graph with invalid max depth."""
        params = {"max_depth": 20}
        
        response = knowledge_handler.knowledge_graph_build(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_knowledge_graph_build_invalid_item_ids_type(self, knowledge_handler, request_context):
        """Test building graph with invalid item_ids type."""
        params = {"item_ids": "not a list"}
        
        response = knowledge_handler.knowledge_graph_build(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_knowledge_graph_structure(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test knowledge graph structure."""
        # Add items first
        knowledge_handler.knowledge_add({"items": sample_knowledge_items}, request_context)
        
        # Build graph
        params = {}
        response = knowledge_handler.knowledge_graph_build(params, request_context)
        
        assert response.status == "success"
        graph = response.data["graph"]
        assert "items" in graph
        assert "relationships" in graph
        assert "metadata" in graph




class TestKnowledgeVerifyEndpoint:
    """Tests for storycore.knowledge.verify endpoint."""
    
    def test_knowledge_verify_all_items(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test verifying all knowledge items."""
        # Add items first
        knowledge_handler.knowledge_add({"items": sample_knowledge_items}, request_context)
        
        # Verify
        params = {}
        response = knowledge_handler.knowledge_verify(params, request_context)
        
        assert response.status == "success"
        assert "status" in response.data
        assert response.data["status"] in ["consistent", "inconsistent", "needs_review"]
        assert "issues" in response.data
        assert response.data["items_checked"] == 3
        assert response.data["verify_time_ms"] >= 0
    
    def test_knowledge_verify_specific_items(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test verifying specific knowledge items."""
        # Add items first
        add_response = knowledge_handler.knowledge_add({"items": sample_knowledge_items}, request_context)
        item_ids = [item["id"] for item in add_response.data["items"][:2]]
        
        # Verify specific items
        params = {"item_ids": item_ids}
        response = knowledge_handler.knowledge_verify(params, request_context)
        
        assert response.status == "success"
        assert response.data["items_checked"] == 2
    
    def test_knowledge_verify_contradictions_only(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test verifying contradictions only."""
        # Add items first
        knowledge_handler.knowledge_add({"items": sample_knowledge_items}, request_context)
        
        # Verify contradictions only
        params = {
            "check_contradictions": True,
            "check_completeness": False,
        }
        response = knowledge_handler.knowledge_verify(params, request_context)
        
        assert response.status == "success"
    
    def test_knowledge_verify_completeness_only(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test verifying completeness only."""
        # Add items first
        knowledge_handler.knowledge_add({"items": sample_knowledge_items}, request_context)
        
        # Verify completeness only
        params = {
            "check_contradictions": False,
            "check_completeness": True,
        }
        response = knowledge_handler.knowledge_verify(params, request_context)
        
        assert response.status == "success"
    
    def test_knowledge_verify_low_confidence_items(self, knowledge_handler, request_context):
        """Test verification detects low confidence items."""
        # Add item with low confidence
        low_confidence_item = {
            "content": "Uncertain information",
            "knowledge_type": "fact",
            "confidence": 0.3,
        }
        knowledge_handler.knowledge_add({"items": [low_confidence_item]}, request_context)
        
        # Verify
        params = {"check_completeness": True}
        response = knowledge_handler.knowledge_verify(params, request_context)
        
        assert response.status == "success"
        # Should detect low confidence issue
        assert len(response.data["issues"]) > 0
    
    def test_knowledge_verify_invalid_item_ids_type(self, knowledge_handler, request_context):
        """Test verification with invalid item_ids type."""
        params = {"item_ids": "not a list"}
        
        response = knowledge_handler.knowledge_verify(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_knowledge_verify_issue_structure(self, knowledge_handler, request_context):
        """Test verification issue structure."""
        # Add item with low confidence
        low_confidence_item = {
            "content": "Uncertain information",
            "knowledge_type": "fact",
            "confidence": 0.3,
        }
        knowledge_handler.knowledge_add({"items": [low_confidence_item]}, request_context)
        
        # Verify
        params = {}
        response = knowledge_handler.knowledge_verify(params, request_context)
        
        assert response.status == "success"
        if response.data["issues"]:
            issue = response.data["issues"][0]
            assert "issue_type" in issue
            assert "severity" in issue
            assert "description" in issue
            assert "affected_items" in issue




class TestKnowledgeExportEndpoint:
    """Tests for storycore.knowledge.export endpoint."""
    
    def test_knowledge_export_json(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test exporting knowledge base as JSON."""
        # Add items first
        knowledge_handler.knowledge_add({"items": sample_knowledge_items}, request_context)
        
        # Export as JSON
        params = {"format": "json"}
        response = knowledge_handler.knowledge_export(params, request_context)
        
        assert response.status == "success"
        assert response.data["format"] == "json"
        assert "content" in response.data
        assert response.data["item_count"] == 3
        assert response.data["export_time_ms"] >= 0
    
    def test_knowledge_export_yaml(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test exporting knowledge base as YAML."""
        # Add items first
        knowledge_handler.knowledge_add({"items": sample_knowledge_items}, request_context)
        
        # Export as YAML
        params = {"format": "yaml"}
        response = knowledge_handler.knowledge_export(params, request_context)
        
        assert response.status == "success"
        assert response.data["format"] == "yaml"
        assert "content" in response.data
    
    def test_knowledge_export_markdown(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test exporting knowledge base as Markdown."""
        # Add items first
        knowledge_handler.knowledge_add({"items": sample_knowledge_items}, request_context)
        
        # Export as Markdown
        params = {"format": "markdown"}
        response = knowledge_handler.knowledge_export(params, request_context)
        
        assert response.status == "success"
        assert response.data["format"] == "markdown"
        assert "content" in response.data
    
    def test_knowledge_export_csv(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test exporting knowledge base as CSV."""
        # Add items first
        knowledge_handler.knowledge_add({"items": sample_knowledge_items}, request_context)
        
        # Export as CSV
        params = {"format": "csv"}
        response = knowledge_handler.knowledge_export(params, request_context)
        
        assert response.status == "success"
        assert response.data["format"] == "csv"
        assert "content" in response.data
    
    def test_knowledge_export_specific_items(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test exporting specific knowledge items."""
        # Add items first
        add_response = knowledge_handler.knowledge_add({"items": sample_knowledge_items}, request_context)
        item_ids = [item["id"] for item in add_response.data["items"][:2]]
        
        # Export specific items
        params = {
            "format": "json",
            "item_ids": item_ids,
        }
        response = knowledge_handler.knowledge_export(params, request_context)
        
        assert response.status == "success"
        assert response.data["item_count"] == 2
    
    def test_knowledge_export_without_relationships(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test exporting without relationships."""
        # Add items first
        knowledge_handler.knowledge_add({"items": sample_knowledge_items}, request_context)
        
        # Export without relationships
        params = {
            "format": "json",
            "include_relationships": False,
        }
        response = knowledge_handler.knowledge_export(params, request_context)
        
        assert response.status == "success"
    
    def test_knowledge_export_without_metadata(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test exporting without metadata."""
        # Add items first
        knowledge_handler.knowledge_add({"items": sample_knowledge_items}, request_context)
        
        # Export without metadata
        params = {
            "format": "json",
            "include_metadata": False,
        }
        response = knowledge_handler.knowledge_export(params, request_context)
        
        assert response.status == "success"
    
    def test_knowledge_export_invalid_format(self, knowledge_handler, request_context):
        """Test export with invalid format."""
        params = {"format": "invalid_format"}
        
        response = knowledge_handler.knowledge_export(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_knowledge_export_invalid_item_ids_type(self, knowledge_handler, request_context):
        """Test export with invalid item_ids type."""
        params = {
            "format": "json",
            "item_ids": "not a list",
        }
        
        response = knowledge_handler.knowledge_export(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"




class TestKnowledgeEndpointIntegration:
    """Integration tests across multiple knowledge endpoints."""
    
    def test_complete_crud_cycle(self, knowledge_handler, request_context):
        """Test complete CRUD cycle: create, read, update, delete."""
        # Create
        create_params = {
            "items": [
                {
                    "content": "Test knowledge item",
                    "knowledge_type": "fact",
                    "tags": ["test"],
                }
            ]
        }
        create_response = knowledge_handler.knowledge_add(create_params, request_context)
        assert create_response.status == "success"
        item_id = create_response.data["items"][0]["id"]
        
        # Read (search)
        search_params = {"query": "Test knowledge"}
        search_response = knowledge_handler.knowledge_search(search_params, request_context)
        assert search_response.status == "success"
        assert search_response.data["total_count"] > 0
        
        # Update
        update_params = {
            "item_id": item_id,
            "updates": {"content": "Updated test knowledge item"}
        }
        update_response = knowledge_handler.knowledge_update(update_params, request_context)
        assert update_response.status == "success"
        assert update_response.data["updated"] is True
        
        # Delete
        delete_params = {"item_ids": [item_id]}
        delete_response = knowledge_handler.knowledge_delete(delete_params, request_context)
        assert delete_response.status == "success"
        assert delete_response.data["deleted_count"] == 1
        
        # Verify deletion
        search_response2 = knowledge_handler.knowledge_search(search_params, request_context)
        assert search_response2.status == "success"
        # Item should not be found
        found_ids = [item["id"] for item in search_response2.data["results"]]
        assert item_id not in found_ids
    
    def test_add_search_export_flow(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test add, search, and export flow."""
        # Add items
        add_response = knowledge_handler.knowledge_add({"items": sample_knowledge_items}, request_context)
        assert add_response.status == "success"
        
        # Search
        search_response = knowledge_handler.knowledge_search({"query": "programming"}, request_context)
        assert search_response.status == "success"
        assert search_response.data["total_count"] > 0
        
        # Export
        export_response = knowledge_handler.knowledge_export({"format": "json"}, request_context)
        assert export_response.status == "success"
        assert export_response.data["item_count"] == 3
    
    def test_add_build_graph_verify_flow(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test add, build graph, and verify flow."""
        # Add items
        add_response = knowledge_handler.knowledge_add({"items": sample_knowledge_items}, request_context)
        assert add_response.status == "success"
        
        # Build graph
        graph_response = knowledge_handler.knowledge_graph_build({}, request_context)
        assert graph_response.status == "success"
        assert graph_response.data["item_count"] == 3
        
        # Verify
        verify_response = knowledge_handler.knowledge_verify({}, request_context)
        assert verify_response.status == "success"
        assert verify_response.data["items_checked"] == 3
    
    def test_multiple_updates_same_item(self, knowledge_handler, request_context):
        """Test multiple updates to the same item."""
        # Add item
        add_response = knowledge_handler.knowledge_add({
            "items": [{"content": "Original", "knowledge_type": "fact"}]
        }, request_context)
        item_id = add_response.data["items"][0]["id"]
        
        # First update
        update1 = knowledge_handler.knowledge_update({
            "item_id": item_id,
            "updates": {"content": "Update 1"}
        }, request_context)
        assert update1.status == "success"
        assert update1.data["item"]["content"] == "Update 1"
        
        # Second update
        update2 = knowledge_handler.knowledge_update({
            "item_id": item_id,
            "updates": {"content": "Update 2", "confidence": 0.9}
        }, request_context)
        assert update2.status == "success"
        assert update2.data["item"]["content"] == "Update 2"
        assert update2.data["item"]["confidence"] == 0.9
    
    def test_search_after_delete(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test search results after deleting items."""
        # Add items
        add_response = knowledge_handler.knowledge_add({"items": sample_knowledge_items}, request_context)
        item_ids = [item["id"] for item in add_response.data["items"]]
        
        # Initial search
        search1 = knowledge_handler.knowledge_search({"query": "programming"}, request_context)
        initial_count = search1.data["total_count"]
        
        # Delete one item
        knowledge_handler.knowledge_delete({"item_ids": [item_ids[0]]}, request_context)
        
        # Search again
        search2 = knowledge_handler.knowledge_search({"query": "programming"}, request_context)
        # Count should be less or equal
        assert search2.data["total_count"] <= initial_count
    
    def test_export_after_updates(self, knowledge_handler, request_context, sample_knowledge_items):
        """Test export reflects updates."""
        # Add items
        add_response = knowledge_handler.knowledge_add({"items": sample_knowledge_items}, request_context)
        item_id = add_response.data["items"][0]["id"]
        
        # Update item
        knowledge_handler.knowledge_update({
            "item_id": item_id,
            "updates": {"content": "Updated for export test"}
        }, request_context)
        
        # Export
        export_response = knowledge_handler.knowledge_export({"format": "json"}, request_context)
        assert export_response.status == "success"
        # Verify updated content is in export
        assert "Updated for export test" in export_response.data["content"]
