"""
Knowledge API Category Handler

This module implements all knowledge management capabilities including adding,
searching, updating, deleting knowledge items, building knowledge graphs,
verifying consistency, and exporting knowledge bases.
"""

import logging
import time
import uuid
import json
import yaml
from typing import Dict, Any, Optional, List
from pathlib import Path
from datetime import datetime

from ..base_handler import BaseAPIHandler
from ..models import APIResponse, RequestContext, ErrorCodes
from ..config import APIConfig
from ..router import APIRouter

from .knowledge_models import (
    KnowledgeItem,
    KnowledgeRelationship,
    KnowledgeGraph,
    KnowledgeAddRequest,
    KnowledgeAddResult,
    KnowledgeSearchRequest,
    KnowledgeSearchResult,
    KnowledgeUpdateRequest,
    KnowledgeUpdateResult,
    KnowledgeDeleteRequest,
    KnowledgeDeleteResult,
    KnowledgeGraphBuildRequest,
    KnowledgeGraphBuildResult,
    KnowledgeVerifyRequest,
    ConsistencyIssue,
    KnowledgeVerifyResult,
    KnowledgeExportRequest,
    KnowledgeExportResult,
    SUPPORTED_KNOWLEDGE_TYPES,
    SUPPORTED_RELATIONSHIP_TYPES,
    SUPPORTED_EXPORT_FORMATS,
    validate_knowledge_type,
    validate_relationship_type,
    validate_export_format,
)


logger = logging.getLogger(__name__)



class KnowledgeCategoryHandler(BaseAPIHandler):
    """
    Handler for Knowledge API category.
    
    Implements 7 endpoints:
    - storycore.knowledge.add: Add knowledge items
    - storycore.knowledge.search: Search knowledge base
    - storycore.knowledge.update: Update knowledge items
    - storycore.knowledge.delete: Delete knowledge items
    - storycore.knowledge.graph.build: Build knowledge graph
    - storycore.knowledge.verify: Verify consistency
    - storycore.knowledge.export: Export knowledge base
    """

    def __init__(self, config: APIConfig, router: APIRouter):
        """Initialize the knowledge category handler."""
        super().__init__(config)
        self.router = router
        
        # Initialize knowledge base storage (in-memory for now)
        self.knowledge_items: Dict[str, KnowledgeItem] = {}
        self.relationships: List[KnowledgeRelationship] = []
        
        # Register all endpoints
        self.register_endpoints()
        
        logger.info("Initialized KnowledgeCategoryHandler with 7 endpoints")


    
    def register_endpoints(self) -> None:
        """Register all knowledge endpoints with the router."""
        
        # Add knowledge items endpoint
        self.router.register_endpoint(
            path="storycore.knowledge.add",
            method="POST",
            handler=self.knowledge_add,
            description="Add knowledge items to knowledge base",
            async_capable=False,
        )
        
        # Search knowledge base endpoint
        self.router.register_endpoint(
            path="storycore.knowledge.search",
            method="POST",
            handler=self.knowledge_search,
            description="Search knowledge base with semantic search",
            async_capable=False,
        )
        
        # Update knowledge item endpoint
        self.router.register_endpoint(
            path="storycore.knowledge.update",
            method="POST",
            handler=self.knowledge_update,
            description="Update existing knowledge items",
            async_capable=False,
        )
        
        # Delete knowledge items endpoint
        self.router.register_endpoint(
            path="storycore.knowledge.delete",
            method="POST",
            handler=self.knowledge_delete,
            description="Delete knowledge items",
            async_capable=False,
        )
        
        # Build knowledge graph endpoint
        self.router.register_endpoint(
            path="storycore.knowledge.graph.build",
            method="POST",
            handler=self.knowledge_graph_build,
            description="Build knowledge graph from items",
            async_capable=False,
        )
        
        # Verify knowledge consistency endpoint
        self.router.register_endpoint(
            path="storycore.knowledge.verify",
            method="POST",
            handler=self.knowledge_verify,
            description="Verify knowledge consistency",
            async_capable=False,
        )
        
        # Export knowledge base endpoint
        self.router.register_endpoint(
            path="storycore.knowledge.export",
            method="POST",
            handler=self.knowledge_export,
            description="Export knowledge base",
            async_capable=False,
        )



    # Helper methods
    
    def _generate_item_id(self) -> str:
        """Generate a unique knowledge item ID."""
        return f"knowledge_{uuid.uuid4().hex[:12]}"
    
    def _semantic_search(self, query: str, items: List[KnowledgeItem], 
                        max_results: int = 10) -> List[KnowledgeItem]:
        """
        Perform semantic search on knowledge items.
        Simple keyword-based implementation for now.
        """
        query_lower = query.lower()
        query_words = set(query_lower.split())
        
        # Score each item based on keyword matches
        scored_items = []
        for item in items:
            content_lower = item.content.lower()
            tags_lower = ' '.join(item.tags).lower()
            
            # Count keyword matches
            score = 0
            for word in query_words:
                if word in content_lower:
                    score += 2
                if word in tags_lower:
                    score += 1
            
            if score > 0:
                scored_items.append((score, item))
        
        # Sort by score descending
        scored_items.sort(key=lambda x: x[0], reverse=True)
        
        # Return top results
        return [item for score, item in scored_items[:max_results]]
    
    def _auto_link_items(self, new_items: List[KnowledgeItem]) -> int:
        """
        Automatically create relationships between new and existing items.
        Returns count of relationships created.
        """
        created_count = 0
        
        for new_item in new_items:
            new_words = set(new_item.content.lower().split())
            
            for existing_id, existing_item in self.knowledge_items.items():
                if existing_id == new_item.id:
                    continue
                
                existing_words = set(existing_item.content.lower().split())
                
                # Find common words
                common_words = new_words & existing_words
                
                # Create relationship if significant overlap
                if len(common_words) >= 3:
                    relationship = KnowledgeRelationship(
                        from_id=new_item.id,
                        to_id=existing_id,
                        relationship_type="related_to",
                        strength=min(1.0, len(common_words) / 10.0),
                    )
                    self.relationships.append(relationship)
                    created_count += 1
        
        return created_count
    
    def _find_contradictions(self, items: List[KnowledgeItem]) -> List[ConsistencyIssue]:
        """Find contradictory knowledge items."""
        issues = []
        
        # Look for explicit contradictions in relationships
        contradiction_rels = [
            rel for rel in self.relationships
            if rel.relationship_type == "contradicts"
        ]
        
        for rel in contradiction_rels:
            from_item = self.knowledge_items.get(rel.from_id)
            to_item = self.knowledge_items.get(rel.to_id)
            
            if from_item and to_item:
                issue = ConsistencyIssue(
                    issue_type="contradiction",
                    severity="warning",
                    description=f"Contradiction found between items",
                    affected_items=[rel.from_id, rel.to_id],
                    suggestion="Review and resolve the contradiction",
                )
                issues.append(issue)
        
        return issues
    
    def _check_completeness(self, items: List[KnowledgeItem]) -> List[ConsistencyIssue]:
        """Check for incomplete knowledge items."""
        issues = []
        
        for item in items:
            # Check for items with low confidence
            if item.confidence < 0.5:
                issue = ConsistencyIssue(
                    issue_type="low_confidence",
                    severity="info",
                    description=f"Item has low confidence: {item.confidence}",
                    affected_items=[item.id],
                    suggestion="Verify and update confidence score",
                )
                issues.append(issue)
            
            # Check for items without tags
            if not item.tags:
                issue = ConsistencyIssue(
                    issue_type="missing_tags",
                    severity="info",
                    description="Item has no tags",
                    affected_items=[item.id],
                    suggestion="Add relevant tags for better organization",
                )
                issues.append(issue)
        
        return issues



    # Knowledge endpoints
    
    def knowledge_add(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Add knowledge items to knowledge base.
        
        Endpoint: storycore.knowledge.add
        Requirements: 11.1
        """
        self.log_request("storycore.knowledge.add", params, context)
        
        try:
            # Validate required parameters
            error_response = self.validate_required_params(
                params, ["items"], context
            )
            if error_response:
                return error_response
            
            # Extract parameters
            items_data = params["items"]
            auto_link = params.get("auto_link", True)
            metadata = params.get("metadata", {})
            
            # Validate items is a list
            if not isinstance(items_data, list):
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message="Items must be a list",
                    context=context,
                    details={"items_type": type(items_data).__name__},
                    remediation="Provide items as a list of dictionaries",
                )
            
            # Validate items is not empty
            if not items_data:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message="Items list cannot be empty",
                    context=context,
                    remediation="Provide at least one knowledge item",
                )
            
            start_add = time.time()
            
            # Create knowledge items
            new_items = []
            for item_data in items_data:
                # Validate required fields
                if "content" not in item_data:
                    return self.create_error_response(
                        error_code=ErrorCodes.VALIDATION_ERROR,
                        message="Each item must have 'content' field",
                        context=context,
                        remediation="Add 'content' field to all items",
                    )
                
                knowledge_type = item_data.get("knowledge_type", "fact").lower()
                
                # Validate knowledge type
                if not validate_knowledge_type(knowledge_type):
                    return self.create_error_response(
                        error_code=ErrorCodes.VALIDATION_ERROR,
                        message=f"Invalid knowledge type: {knowledge_type}",
                        context=context,
                        details={
                            "knowledge_type": knowledge_type,
                            "supported_types": SUPPORTED_KNOWLEDGE_TYPES
                        },
                        remediation=f"Use one of: {', '.join(SUPPORTED_KNOWLEDGE_TYPES)}",
                    )
                
                # Create knowledge item
                item_id = item_data.get("id", self._generate_item_id())
                item = KnowledgeItem(
                    id=item_id,
                    content=item_data["content"],
                    knowledge_type=knowledge_type,
                    tags=item_data.get("tags", []),
                    metadata=item_data.get("metadata", {}),
                    source=item_data.get("source"),
                    confidence=item_data.get("confidence", 1.0),
                )
                
                # Store item
                self.knowledge_items[item_id] = item
                new_items.append(item)
            
            # Auto-link items if requested
            auto_linked_count = 0
            if auto_link:
                auto_linked_count = self._auto_link_items(new_items)
            
            add_time_ms = (time.time() - start_add) * 1000
            
            result = KnowledgeAddResult(
                added_count=len(new_items),
                items=new_items,
                auto_linked_count=auto_linked_count,
                add_time_ms=add_time_ms,
                metadata=metadata,
            )
            
            response_data = {
                "added_count": result.added_count,
                "items": [item.to_dict() for item in result.items],
                "auto_linked_count": result.auto_linked_count,
                "add_time_ms": result.add_time_ms,
                "metadata": result.metadata,
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.knowledge.add", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)



    def knowledge_search(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Search knowledge base with semantic search.
        
        Endpoint: storycore.knowledge.search
        Requirements: 11.2
        """
        self.log_request("storycore.knowledge.search", params, context)
        
        try:
            # Validate required parameters
            error_response = self.validate_required_params(
                params, ["query"], context
            )
            if error_response:
                return error_response
            
            # Extract parameters
            query = params["query"]
            knowledge_types = params.get("knowledge_types", [])
            tags = params.get("tags", [])
            max_results = params.get("max_results", 10)
            min_confidence = params.get("min_confidence", 0.0)
            semantic_search = params.get("semantic_search", True)
            metadata = params.get("metadata", {})
            
            # Validate query is not empty
            if not query.strip():
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message="Query cannot be empty",
                    context=context,
                    remediation="Provide a non-empty search query",
                )
            
            # Validate max_results
            if max_results < 1 or max_results > 100:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid max_results: {max_results}",
                    context=context,
                    details={"max_results": max_results, "valid_range": "1-100"},
                    remediation="Use max_results between 1 and 100",
                )
            
            # Validate knowledge types
            if knowledge_types:
                invalid_types = [kt for kt in knowledge_types if not validate_knowledge_type(kt)]
                if invalid_types:
                    return self.create_error_response(
                        error_code=ErrorCodes.VALIDATION_ERROR,
                        message=f"Invalid knowledge types: {', '.join(invalid_types)}",
                        context=context,
                        details={
                            "invalid_types": invalid_types,
                            "supported_types": SUPPORTED_KNOWLEDGE_TYPES
                        },
                        remediation=f"Use valid types: {', '.join(SUPPORTED_KNOWLEDGE_TYPES)}",
                    )
            
            start_search = time.time()
            
            # Filter items by type and tags
            filtered_items = list(self.knowledge_items.values())
            
            if knowledge_types:
                filtered_items = [
                    item for item in filtered_items
                    if item.knowledge_type in knowledge_types
                ]
            
            if tags:
                filtered_items = [
                    item for item in filtered_items
                    if any(tag in item.tags for tag in tags)
                ]
            
            # Filter by confidence
            filtered_items = [
                item for item in filtered_items
                if item.confidence >= min_confidence
            ]
            
            # Perform search
            if semantic_search:
                results = self._semantic_search(query, filtered_items, max_results)
            else:
                # Simple substring match
                query_lower = query.lower()
                results = [
                    item for item in filtered_items
                    if query_lower in item.content.lower()
                ][:max_results]
            
            search_time_ms = (time.time() - start_search) * 1000
            
            result = KnowledgeSearchResult(
                query=query,
                results=results,
                total_count=len(results),
                search_time_ms=search_time_ms,
                metadata=metadata,
            )
            
            response_data = {
                "query": result.query,
                "results": [item.to_dict() for item in result.results],
                "total_count": result.total_count,
                "search_time_ms": result.search_time_ms,
                "metadata": result.metadata,
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.knowledge.search", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)



    def knowledge_update(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Update existing knowledge items.
        
        Endpoint: storycore.knowledge.update
        Requirements: 11.3
        """
        self.log_request("storycore.knowledge.update", params, context)
        
        try:
            # Validate required parameters
            error_response = self.validate_required_params(
                params, ["item_id", "updates"], context
            )
            if error_response:
                return error_response
            
            # Extract parameters
            item_id = params["item_id"]
            updates = params["updates"]
            metadata = params.get("metadata", {})
            
            # Validate updates is a dictionary
            if not isinstance(updates, dict):
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message="Updates must be a dictionary",
                    context=context,
                    details={"updates_type": type(updates).__name__},
                    remediation="Provide updates as a dictionary of field-value pairs",
                )
            
            # Validate updates is not empty
            if not updates:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message="Updates dictionary cannot be empty",
                    context=context,
                    remediation="Provide at least one field to update",
                )
            
            start_update = time.time()
            
            # Check if item exists
            if item_id not in self.knowledge_items:
                update_time_ms = (time.time() - start_update) * 1000
                
                result = KnowledgeUpdateResult(
                    updated=False,
                    item=None,
                    update_time_ms=update_time_ms,
                    metadata=metadata,
                )
                
                return self.create_error_response(
                    error_code=ErrorCodes.NOT_FOUND,
                    message=f"Knowledge item not found: {item_id}",
                    context=context,
                    details={"item_id": item_id},
                    remediation="Verify the item ID exists in the knowledge base",
                )
            
            item = self.knowledge_items[item_id]
            
            # Apply updates
            if "content" in updates:
                item.content = updates["content"]
            
            if "knowledge_type" in updates:
                knowledge_type = updates["knowledge_type"].lower()
                if not validate_knowledge_type(knowledge_type):
                    return self.create_error_response(
                        error_code=ErrorCodes.VALIDATION_ERROR,
                        message=f"Invalid knowledge type: {knowledge_type}",
                        context=context,
                        details={
                            "knowledge_type": knowledge_type,
                            "supported_types": SUPPORTED_KNOWLEDGE_TYPES
                        },
                        remediation=f"Use one of: {', '.join(SUPPORTED_KNOWLEDGE_TYPES)}",
                    )
                item.knowledge_type = knowledge_type
            
            if "tags" in updates:
                item.tags = updates["tags"]
            
            if "metadata" in updates:
                item.metadata.update(updates["metadata"])
            
            if "source" in updates:
                item.source = updates["source"]
            
            if "confidence" in updates:
                confidence = updates["confidence"]
                if not (0.0 <= confidence <= 1.0):
                    return self.create_error_response(
                        error_code=ErrorCodes.VALIDATION_ERROR,
                        message=f"Invalid confidence value: {confidence}",
                        context=context,
                        details={"confidence": confidence, "valid_range": "0.0-1.0"},
                        remediation="Use confidence value between 0.0 and 1.0",
                    )
                item.confidence = confidence
            
            # Update timestamp
            item.updated_at = datetime.now()
            
            update_time_ms = (time.time() - start_update) * 1000
            
            result = KnowledgeUpdateResult(
                updated=True,
                item=item,
                update_time_ms=update_time_ms,
                metadata=metadata,
            )
            
            response_data = {
                "updated": result.updated,
                "item": result.item.to_dict() if result.item else None,
                "update_time_ms": result.update_time_ms,
                "metadata": result.metadata,
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.knowledge.update", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)



    def knowledge_delete(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Delete knowledge items.
        
        Endpoint: storycore.knowledge.delete
        Requirements: 11.4
        """
        self.log_request("storycore.knowledge.delete", params, context)
        
        try:
            # Validate required parameters
            error_response = self.validate_required_params(
                params, ["item_ids"], context
            )
            if error_response:
                return error_response
            
            # Extract parameters
            item_ids = params["item_ids"]
            cascade = params.get("cascade", False)
            metadata = params.get("metadata", {})
            
            # Validate item_ids is a list
            if not isinstance(item_ids, list):
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message="Item IDs must be a list",
                    context=context,
                    details={"item_ids_type": type(item_ids).__name__},
                    remediation="Provide item_ids as a list of strings",
                )
            
            # Validate item_ids is not empty
            if not item_ids:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message="Item IDs list cannot be empty",
                    context=context,
                    remediation="Provide at least one item ID to delete",
                )
            
            start_delete = time.time()
            
            # Delete items
            deleted_ids = []
            cascaded_count = 0
            
            for item_id in item_ids:
                if item_id in self.knowledge_items:
                    del self.knowledge_items[item_id]
                    deleted_ids.append(item_id)
                    
                    # Remove relationships involving this item
                    self.relationships = [
                        rel for rel in self.relationships
                        if rel.from_id != item_id and rel.to_id != item_id
                    ]
                    
                    # If cascade, delete related items
                    if cascade:
                        # Find items that depend on this one
                        dependent_rels = [
                            rel for rel in self.relationships
                            if rel.to_id == item_id and rel.relationship_type == "depends_on"
                        ]
                        
                        for rel in dependent_rels:
                            if rel.from_id in self.knowledge_items:
                                del self.knowledge_items[rel.from_id]
                                cascaded_count += 1
            
            delete_time_ms = (time.time() - start_delete) * 1000
            
            result = KnowledgeDeleteResult(
                deleted_count=len(deleted_ids),
                deleted_ids=deleted_ids,
                cascaded_count=cascaded_count,
                delete_time_ms=delete_time_ms,
                metadata=metadata,
            )
            
            response_data = {
                "deleted_count": result.deleted_count,
                "deleted_ids": result.deleted_ids,
                "cascaded_count": result.cascaded_count,
                "delete_time_ms": result.delete_time_ms,
                "metadata": result.metadata,
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.knowledge.delete", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)



    def knowledge_graph_build(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Build knowledge graph from items.
        
        Endpoint: storycore.knowledge.graph.build
        Requirements: 11.5
        """
        self.log_request("storycore.knowledge.graph.build", params, context)
        
        try:
            # Extract parameters
            item_ids = params.get("item_ids")
            include_relationships = params.get("include_relationships", True)
            max_depth = params.get("max_depth", 3)
            metadata = params.get("metadata", {})
            
            # Validate max_depth
            if max_depth < 1 or max_depth > 10:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid max_depth: {max_depth}",
                    context=context,
                    details={"max_depth": max_depth, "valid_range": "1-10"},
                    remediation="Use max_depth between 1 and 10",
                )
            
            start_build = time.time()
            
            # Determine which items to include
            if item_ids:
                # Validate item_ids is a list
                if not isinstance(item_ids, list):
                    return self.create_error_response(
                        error_code=ErrorCodes.VALIDATION_ERROR,
                        message="Item IDs must be a list",
                        context=context,
                        details={"item_ids_type": type(item_ids).__name__},
                        remediation="Provide item_ids as a list of strings or null for all items",
                    )
                
                # Get specified items
                items = [
                    self.knowledge_items[item_id]
                    for item_id in item_ids
                    if item_id in self.knowledge_items
                ]
            else:
                # Get all items
                items = list(self.knowledge_items.values())
            
            # Get relationships
            if include_relationships:
                item_id_set = {item.id for item in items}
                relationships = [
                    rel for rel in self.relationships
                    if rel.from_id in item_id_set or rel.to_id in item_id_set
                ]
            else:
                relationships = []
            
            # Build graph
            graph = KnowledgeGraph(
                items=items,
                relationships=relationships,
                metadata={
                    "max_depth": max_depth,
                    "build_timestamp": datetime.now().isoformat(),
                }
            )
            
            build_time_ms = (time.time() - start_build) * 1000
            
            result = KnowledgeGraphBuildResult(
                graph=graph,
                item_count=len(items),
                relationship_count=len(relationships),
                build_time_ms=build_time_ms,
                metadata=metadata,
            )
            
            response_data = {
                "graph": result.graph.to_dict(),
                "item_count": result.item_count,
                "relationship_count": result.relationship_count,
                "build_time_ms": result.build_time_ms,
                "metadata": result.metadata,
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.knowledge.graph.build", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)



    def knowledge_verify(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Verify knowledge consistency.
        
        Endpoint: storycore.knowledge.verify
        Requirements: 11.6
        """
        self.log_request("storycore.knowledge.verify", params, context)
        
        try:
            # Extract parameters
            item_ids = params.get("item_ids")
            check_contradictions = params.get("check_contradictions", True)
            check_completeness = params.get("check_completeness", True)
            metadata = params.get("metadata", {})
            
            start_verify = time.time()
            
            # Determine which items to verify
            if item_ids:
                # Validate item_ids is a list
                if not isinstance(item_ids, list):
                    return self.create_error_response(
                        error_code=ErrorCodes.VALIDATION_ERROR,
                        message="Item IDs must be a list",
                        context=context,
                        details={"item_ids_type": type(item_ids).__name__},
                        remediation="Provide item_ids as a list of strings or null for all items",
                    )
                
                # Get specified items
                items = [
                    self.knowledge_items[item_id]
                    for item_id in item_ids
                    if item_id in self.knowledge_items
                ]
            else:
                # Get all items
                items = list(self.knowledge_items.values())
            
            # Collect issues
            issues = []
            
            # Check for contradictions
            if check_contradictions:
                contradiction_issues = self._find_contradictions(items)
                issues.extend(contradiction_issues)
            
            # Check for completeness
            if check_completeness:
                completeness_issues = self._check_completeness(items)
                issues.extend(completeness_issues)
            
            # Determine overall status
            if not issues:
                status = "consistent"
            else:
                critical_issues = [i for i in issues if i.severity == "critical"]
                if critical_issues:
                    status = "inconsistent"
                else:
                    status = "needs_review"
            
            verify_time_ms = (time.time() - start_verify) * 1000
            
            result = KnowledgeVerifyResult(
                status=status,
                issues=issues,
                items_checked=len(items),
                verify_time_ms=verify_time_ms,
                metadata=metadata,
            )
            
            response_data = {
                "status": result.status,
                "issues": [issue.to_dict() for issue in result.issues],
                "items_checked": result.items_checked,
                "verify_time_ms": result.verify_time_ms,
                "metadata": result.metadata,
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.knowledge.verify", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)



    def knowledge_export(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Export knowledge base.
        
        Endpoint: storycore.knowledge.export
        Requirements: 11.7
        """
        self.log_request("storycore.knowledge.export", params, context)
        
        try:
            # Extract parameters
            export_format = params.get("format", "json").lower()
            item_ids = params.get("item_ids")
            include_relationships = params.get("include_relationships", True)
            include_metadata = params.get("include_metadata", True)
            metadata = params.get("metadata", {})
            
            # Validate export format
            if not validate_export_format(export_format):
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid export format: {export_format}",
                    context=context,
                    details={
                        "format": export_format,
                        "supported_formats": SUPPORTED_EXPORT_FORMATS
                    },
                    remediation=f"Use one of: {', '.join(SUPPORTED_EXPORT_FORMATS)}",
                )
            
            start_export = time.time()
            
            # Determine which items to export
            if item_ids:
                # Validate item_ids is a list
                if not isinstance(item_ids, list):
                    return self.create_error_response(
                        error_code=ErrorCodes.VALIDATION_ERROR,
                        message="Item IDs must be a list",
                        context=context,
                        details={"item_ids_type": type(item_ids).__name__},
                        remediation="Provide item_ids as a list of strings or null for all items",
                    )
                
                # Get specified items
                items = [
                    self.knowledge_items[item_id]
                    for item_id in item_ids
                    if item_id in self.knowledge_items
                ]
            else:
                # Get all items
                items = list(self.knowledge_items.values())
            
            # Prepare export data
            export_data = {
                "items": [item.to_dict() for item in items],
            }
            
            if include_relationships:
                item_id_set = {item.id for item in items}
                relationships = [
                    rel for rel in self.relationships
                    if rel.from_id in item_id_set or rel.to_id in item_id_set
                ]
                export_data["relationships"] = [rel.to_dict() for rel in relationships]
            
            if include_metadata:
                export_data["metadata"] = {
                    "export_timestamp": datetime.now().isoformat(),
                    "item_count": len(items),
                    "format": export_format,
                }
            
            # Format export content
            if export_format == "json":
                content = json.dumps(export_data, indent=2)
            elif export_format == "yaml":
                content = yaml.dump(export_data, default_flow_style=False)
            elif export_format == "markdown":
                # Simple markdown format
                lines = ["# Knowledge Base Export\n"]
                for item in items:
                    lines.append(f"## {item.id}")
                    lines.append(f"**Type:** {item.knowledge_type}")
                    lines.append(f"**Content:** {item.content}")
                    if item.tags:
                        lines.append(f"**Tags:** {', '.join(item.tags)}")
                    lines.append("")
                content = "\n".join(lines)
            elif export_format == "csv":
                # Simple CSV format
                lines = ["id,knowledge_type,content,tags,confidence"]
                for item in items:
                    tags_str = ';'.join(item.tags)
                    lines.append(f'"{item.id}","{item.knowledge_type}","{item.content}","{tags_str}",{item.confidence}')
                content = "\n".join(lines)
            else:
                # RDF format (simplified)
                content = f"# RDF export not fully implemented\n{json.dumps(export_data, indent=2)}"
            
            export_time_ms = (time.time() - start_export) * 1000
            
            result = KnowledgeExportResult(
                format=export_format,
                content=content,
                item_count=len(items),
                export_time_ms=export_time_ms,
                metadata=metadata,
            )
            
            response_data = {
                "format": result.format,
                "content": result.content,
                "item_count": result.item_count,
                "export_path": result.export_path,
                "export_time_ms": result.export_time_ms,
                "metadata": result.metadata,
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.knowledge.export", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)
