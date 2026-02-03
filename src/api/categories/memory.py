"""
Memory and Context Category Handler

This module implements all 8 memory and context API endpoints.
"""

import logging
import json
from typing import Dict, Any, Optional, List
from pathlib import Path
from datetime import datetime
import uuid

from ..base_handler import BaseAPIHandler
from ..models import APIResponse, RequestContext, ErrorCodes
from ..config import APIConfig
from ..router import APIRouter

from .memory_models import (
    MemoryItem,
    MemorySearchResult,
    ContextItem,
    ContextState,
    MemoryStoreRequest,
    MemoryRetrieveRequest,
    MemorySearchRequest,
    MemoryClearRequest,
    ContextPushRequest,
    ContextPopRequest,
    ContextGetRequest,
    ContextResetRequest,
)

logger = logging.getLogger(__name__)


class MemoryCategoryHandler(BaseAPIHandler):
    """
    Handler for Memory and Context API category.
    
    Implements 8 endpoints for memory storage/retrieval and context stack management.
    """
    
    def __init__(self, config: APIConfig, router: APIRouter):
        """
        Initialize memory and context handler.
        
        Args:
            config: API configuration
            router: API router for endpoint registration
        """
        super().__init__(config)
        self.router = router
        
        # In-memory storage for memory items (keyed by project_name)
        self.memory_stores: Dict[str, Dict[str, MemoryItem]] = {}
        
        # Context stacks (keyed by project_name)
        self.context_stacks: Dict[str, List[ContextItem]] = {}
        
        # Default context values
        self.default_contexts: Dict[str, Dict[str, Any]] = {}
        
        # Register all endpoints
        self.register_endpoints()
        
        logger.info("Initialized MemoryCategoryHandler with 8 endpoints")
    
    def register_endpoints(self) -> None:
        """Register all memory and context endpoints with the router."""
        
        # Memory management endpoints (4)
        self.router.register_endpoint(
            path="storycore.memory.store",
            method="POST",
            handler=self.store_memory,
            description="Store key-value data in project memory",
            async_capable=False,
        )
        
        self.router.register_endpoint(
            path="storycore.memory.retrieve",
            method="GET",
            handler=self.retrieve_memory,
            description="Retrieve stored data by key",
            async_capable=False,
        )
        
        self.router.register_endpoint(
            path="storycore.memory.search",
            method="POST",
            handler=self.search_memory,
            description="Search memory for semantically similar items",
            async_capable=False,
        )
        
        self.router.register_endpoint(
            path="storycore.memory.clear",
            method="POST",
            handler=self.clear_memory,
            description="Remove specified memory entries",
            async_capable=False,
        )
        
        # Context stack endpoints (4)
        self.router.register_endpoint(
            path="storycore.context.push",
            method="POST",
            handler=self.push_context,
            description="Add data to active context stack",
            async_capable=False,
        )
        
        self.router.register_endpoint(
            path="storycore.context.pop",
            method="POST",
            handler=self.pop_context,
            description="Remove and return top context item",
            async_capable=False,
        )
        
        self.router.register_endpoint(
            path="storycore.context.get",
            method="GET",
            handler=self.get_context,
            description="Get current active context without modification",
            async_capable=False,
        )
        
        self.router.register_endpoint(
            path="storycore.context.reset",
            method="POST",
            handler=self.reset_context,
            description="Clear all context and restore default state",
            async_capable=False,
        )
    
    # Helper methods
    
    def _get_memory_store(self, project_name: str) -> Dict[str, MemoryItem]:
        """Get or create memory store for a project."""
        if project_name not in self.memory_stores:
            self.memory_stores[project_name] = {}
        return self.memory_stores[project_name]
    
    def _get_context_stack(self, project_name: str) -> List[ContextItem]:
        """Get or create context stack for a project."""
        if project_name not in self.context_stacks:
            self.context_stacks[project_name] = []
        return self.context_stacks[project_name]
    
    def _get_default_context(self, project_name: str) -> Dict[str, Any]:
        """Get default context for a project."""
        if project_name not in self.default_contexts:
            self.default_contexts[project_name] = {
                "project_name": project_name,
                "initialized_at": datetime.now().isoformat(),
            }
        return self.default_contexts[project_name]
    
    def _calculate_similarity(self, query: str, text: str) -> float:
        """
        Calculate simple text similarity score.
        
        This is a basic implementation. In production, this would use
        embeddings and semantic similarity (e.g., sentence transformers).
        
        Args:
            query: Search query
            text: Text to compare against
            
        Returns:
            Similarity score (0.0 to 1.0)
        """
        query_lower = query.lower()
        text_lower = text.lower()
        
        # Exact match
        if query_lower == text_lower:
            return 1.0
        
        # Contains query
        if query_lower in text_lower:
            return 0.8
        
        # Word overlap
        query_words = set(query_lower.split())
        text_words = set(text_lower.split())
        
        if not query_words or not text_words:
            return 0.0
        
        overlap = len(query_words & text_words)
        total = len(query_words | text_words)
        
        return overlap / total if total > 0 else 0.0
    
    def _persist_memory(self, project_name: str, base_path: str = ".") -> None:
        """
        Persist memory store to disk.
        
        Args:
            project_name: Project name
            base_path: Base path for projects
        """
        try:
            project_path = Path(base_path) / project_name
            if not project_path.exists():
                return
            
            memory_dir = project_path / "memory"
            memory_dir.mkdir(exist_ok=True)
            
            memory_file = memory_dir / "memory_store.json"
            memory_store = self._get_memory_store(project_name)
            
            # Convert MemoryItem objects to dict for JSON serialization
            serializable_store = {}
            for key, item in memory_store.items():
                serializable_store[key] = {
                    "key": item.key,
                    "value": item.value,
                    "created_at": item.created_at.isoformat(),
                    "updated_at": item.updated_at.isoformat(),
                    "metadata": item.metadata,
                    "tags": item.tags,
                }
            
            with open(memory_file, "w") as f:
                json.dump(serializable_store, f, indent=2)
                
        except Exception as e:
            logger.warning(f"Failed to persist memory for {project_name}: {e}")
    
    def _load_memory(self, project_name: str, base_path: str = ".") -> None:
        """
        Load memory store from disk.
        
        Args:
            project_name: Project name
            base_path: Base path for projects
        """
        try:
            project_path = Path(base_path) / project_name
            memory_file = project_path / "memory" / "memory_store.json"
            
            if not memory_file.exists():
                return
            
            with open(memory_file, "r") as f:
                serialized_store = json.load(f)
            
            memory_store = self._get_memory_store(project_name)
            
            for key, item_data in serialized_store.items():
                memory_store[key] = MemoryItem(
                    key=item_data["key"],
                    value=item_data["value"],
                    created_at=datetime.fromisoformat(item_data["created_at"]),
                    updated_at=datetime.fromisoformat(item_data["updated_at"]),
                    metadata=item_data.get("metadata", {}),
                    tags=item_data.get("tags", []),
                )
                
        except Exception as e:
            logger.warning(f"Failed to load memory for {project_name}: {e}")
    
    # Memory management endpoints
    
    def store_memory(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Store key-value data in project memory.
        
        Endpoint: storycore.memory.store
        Requirements: 4.1
        """
        error = self.validate_required_params(params, ["project_name", "key", "value"], context)
        if error:
            return error
        
        try:
            project_name = params["project_name"]
            key = params["key"]
            value = params["value"]
            metadata = params.get("metadata", {})
            tags = params.get("tags", [])
            overwrite = params.get("overwrite", True)
            base_path = params.get("base_path", ".")
            
            # Load existing memory if not already loaded
            if project_name not in self.memory_stores:
                self._load_memory(project_name, base_path)
            
            memory_store = self._get_memory_store(project_name)
            
            # Check if key exists and overwrite is False
            if key in memory_store and not overwrite:
                return self.create_error_response(
                    error_code=ErrorCodes.CONFLICT,
                    message=f"Memory key '{key}' already exists",
                    context=context,
                    details={"key": key, "existing_value": memory_store[key].value},
                    remediation="Set overwrite=true to replace existing value",
                )
            
            # Create or update memory item
            now = datetime.now()
            if key in memory_store:
                # Update existing
                memory_store[key].value = value
                memory_store[key].updated_at = now
                memory_store[key].metadata.update(metadata)
                memory_store[key].tags = list(set(memory_store[key].tags + tags))
                created = False
            else:
                # Create new
                memory_store[key] = MemoryItem(
                    key=key,
                    value=value,
                    created_at=now,
                    updated_at=now,
                    metadata=metadata,
                    tags=tags,
                )
                created = True
            
            # Persist to disk
            self._persist_memory(project_name, base_path)
            
            response_data = {
                "project_name": project_name,
                "key": key,
                "value": value,
                "created": created,
                "updated_at": memory_store[key].updated_at.isoformat(),
                "metadata": memory_store[key].metadata,
                "tags": memory_store[key].tags,
            }
            
            return self.create_success_response(response_data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def retrieve_memory(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Retrieve stored data by key.
        
        Endpoint: storycore.memory.retrieve
        Requirements: 4.2
        """
        error = self.validate_required_params(params, ["project_name", "key"], context)
        if error:
            return error
        
        try:
            project_name = params["project_name"]
            key = params["key"]
            default = params.get("default")
            base_path = params.get("base_path", ".")
            
            # Load existing memory if not already loaded
            if project_name not in self.memory_stores:
                self._load_memory(project_name, base_path)
            
            memory_store = self._get_memory_store(project_name)
            
            # Check if key exists
            if key not in memory_store:
                if default is not None:
                    response_data = {
                        "project_name": project_name,
                        "key": key,
                        "value": default,
                        "found": False,
                        "default_used": True,
                    }
                    return self.create_success_response(response_data, context)
                else:
                    response_data = {
                        "project_name": project_name,
                        "key": key,
                        "value": None,
                        "found": False,
                        "default_used": False,
                    }
                    return self.create_success_response(response_data, context)
            
            # Return stored value
            item = memory_store[key]
            response_data = {
                "project_name": project_name,
                "key": key,
                "value": item.value,
                "found": True,
                "created_at": item.created_at.isoformat(),
                "updated_at": item.updated_at.isoformat(),
                "metadata": item.metadata,
                "tags": item.tags,
            }
            
            return self.create_success_response(response_data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def search_memory(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Search memory for semantically similar items.
        
        Endpoint: storycore.memory.search
        Requirements: 4.3
        """
        error = self.validate_required_params(params, ["project_name", "query"], context)
        if error:
            return error
        
        try:
            project_name = params["project_name"]
            query = params["query"]
            limit = params.get("limit", 10)
            threshold = params.get("threshold", 0.5)
            tags = params.get("tags")
            base_path = params.get("base_path", ".")
            
            # Load existing memory if not already loaded
            if project_name not in self.memory_stores:
                self._load_memory(project_name, base_path)
            
            memory_store = self._get_memory_store(project_name)
            
            # Search for similar items
            results = []
            for key, item in memory_store.items():
                # Filter by tags if specified
                if tags and not any(tag in item.tags for tag in tags):
                    continue
                
                # Calculate similarity
                # Search in key, value (if string), and metadata
                search_text = key
                if isinstance(item.value, str):
                    search_text += " " + item.value
                if item.metadata:
                    search_text += " " + json.dumps(item.metadata)
                
                score = self._calculate_similarity(query, search_text)
                
                if score >= threshold:
                    results.append(MemorySearchResult(
                        key=key,
                        value=item.value,
                        score=score,
                        metadata=item.metadata,
                    ))
            
            # Sort by score (descending) and limit
            results.sort(key=lambda x: x.score, reverse=True)
            results = results[:limit]
            
            # Convert to serializable format
            serializable_results = [
                {
                    "key": r.key,
                    "value": r.value,
                    "score": r.score,
                    "metadata": r.metadata,
                }
                for r in results
            ]
            
            response_data = {
                "project_name": project_name,
                "query": query,
                "results": serializable_results,
                "count": len(serializable_results),
                "threshold": threshold,
            }
            
            return self.create_success_response(response_data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def clear_memory(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Remove specified memory entries.
        
        Endpoint: storycore.memory.clear
        Requirements: 4.4
        """
        error = self.validate_required_params(params, ["project_name"], context)
        if error:
            return error
        
        try:
            project_name = params["project_name"]
            keys = params.get("keys")
            tags = params.get("tags")
            base_path = params.get("base_path", ".")
            
            # Load existing memory if not already loaded
            if project_name not in self.memory_stores:
                self._load_memory(project_name, base_path)
            
            memory_store = self._get_memory_store(project_name)
            
            cleared_keys = []
            
            # Clear all if no keys or tags specified
            if keys is None and tags is None:
                cleared_keys = list(memory_store.keys())
                memory_store.clear()
            else:
                # Clear specific keys
                if keys:
                    for key in keys:
                        if key in memory_store:
                            del memory_store[key]
                            cleared_keys.append(key)
                
                # Clear by tags
                if tags:
                    keys_to_remove = []
                    for key, item in memory_store.items():
                        if any(tag in item.tags for tag in tags):
                            keys_to_remove.append(key)
                    
                    for key in keys_to_remove:
                        del memory_store[key]
                        if key not in cleared_keys:
                            cleared_keys.append(key)
            
            # Persist to disk
            self._persist_memory(project_name, base_path)
            
            response_data = {
                "project_name": project_name,
                "cleared_keys": cleared_keys,
                "count": len(cleared_keys),
                "remaining_count": len(memory_store),
            }
            
            return self.create_success_response(response_data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    # Context stack endpoints
    
    def push_context(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Add data to active context stack.
        
        Endpoint: storycore.context.push
        Requirements: 4.5
        """
        error = self.validate_required_params(params, ["project_name", "data"], context)
        if error:
            return error
        
        try:
            project_name = params["project_name"]
            data = params["data"]
            source = params.get("source")
            metadata = params.get("metadata", {})
            
            # Get context stack
            context_stack = self._get_context_stack(project_name)
            
            # Create context item
            context_item = ContextItem(
                data=data,
                pushed_at=datetime.now(),
                source=source,
                metadata=metadata,
            )
            
            # Push to stack
            context_stack.append(context_item)
            
            response_data = {
                "project_name": project_name,
                "stack_size": len(context_stack),
                "pushed_at": context_item.pushed_at.isoformat(),
                "source": source,
            }
            
            return self.create_success_response(response_data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def pop_context(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Remove and return top context item.
        
        Endpoint: storycore.context.pop
        Requirements: 4.6
        """
        error = self.validate_required_params(params, ["project_name"], context)
        if error:
            return error
        
        try:
            project_name = params["project_name"]
            count = params.get("count", 1)
            
            # Get context stack
            context_stack = self._get_context_stack(project_name)
            
            # Check if stack is empty
            if not context_stack:
                return self.create_error_response(
                    error_code=ErrorCodes.CONFLICT,
                    message=f"Context stack for project '{project_name}' is empty",
                    context=context,
                    details={"project_name": project_name},
                    remediation="Push context data first using storycore.context.push",
                )
            
            # Pop items
            popped_items = []
            for _ in range(min(count, len(context_stack))):
                item = context_stack.pop()
                popped_items.append({
                    "data": item.data,
                    "pushed_at": item.pushed_at.isoformat(),
                    "source": item.source,
                    "metadata": item.metadata,
                })
            
            response_data = {
                "project_name": project_name,
                "popped_items": popped_items,
                "count": len(popped_items),
                "remaining_stack_size": len(context_stack),
            }
            
            return self.create_success_response(response_data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def get_context(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Get current active context without modification.
        
        Endpoint: storycore.context.get
        Requirements: 4.7
        """
        error = self.validate_required_params(params, ["project_name"], context)
        if error:
            return error
        
        try:
            project_name = params["project_name"]
            include_stack = params.get("include_stack", False)
            
            # Get context stack
            context_stack = self._get_context_stack(project_name)
            
            # Get default context
            default_context = self._get_default_context(project_name)
            
            # Get current context (top of stack or default)
            current_context = None
            if context_stack:
                current_context = context_stack[-1].data
            else:
                current_context = default_context
            
            response_data = {
                "project_name": project_name,
                "current_context": current_context,
                "stack_size": len(context_stack),
                "has_context": len(context_stack) > 0,
            }
            
            # Include full stack if requested
            if include_stack:
                stack_items = [
                    {
                        "data": item.data,
                        "pushed_at": item.pushed_at.isoformat(),
                        "source": item.source,
                        "metadata": item.metadata,
                    }
                    for item in context_stack
                ]
                response_data["stack"] = stack_items
            
            return self.create_success_response(response_data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def reset_context(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Clear all context and restore default state.
        
        Endpoint: storycore.context.reset
        Requirements: 4.8
        """
        error = self.validate_required_params(params, ["project_name"], context)
        if error:
            return error
        
        try:
            project_name = params["project_name"]
            preserve_defaults = params.get("preserve_defaults", True)
            
            # Get context stack
            context_stack = self._get_context_stack(project_name)
            
            # Record stack size before clearing
            previous_stack_size = len(context_stack)
            
            # Clear the stack
            context_stack.clear()
            
            # Reset default context if not preserving
            if not preserve_defaults:
                self.default_contexts[project_name] = {
                    "project_name": project_name,
                    "initialized_at": datetime.now().isoformat(),
                }
            
            default_context = self._get_default_context(project_name)
            
            response_data = {
                "project_name": project_name,
                "reset_at": datetime.now().isoformat(),
                "previous_stack_size": previous_stack_size,
                "current_stack_size": 0,
                "default_context": default_context,
                "preserved_defaults": preserve_defaults,
            }
            
            return self.create_success_response(response_data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
