"""
Prompt Engineering Category Handler

This module implements all 10 prompt engineering API endpoints.
"""

import logging
import json
import re
import uuid
from typing import Dict, Any, Optional, List
from datetime import datetime

from ..base_handler import BaseAPIHandler
from ..models import APIResponse, RequestContext, ErrorCodes
from ..config import APIConfig
from ..router import APIRouter

from .prompt_models import (
    PromptTemplate,
    PromptTestResult,
    PromptOptimizationResult,
    PromptVariables,
    PromptChain,
    PromptChainExecutionResult,
)
from .llm_service import LLMService
from .narration_models import LLMConfig

logger = logging.getLogger(__name__)


class PromptCategoryHandler(BaseAPIHandler):
    """
    Handler for Prompt Engineering API category.
    
    Implements 10 endpoints for prompt template management, testing, optimization, and chaining.
    """
    
    def __init__(self, config: APIConfig, router: APIRouter, llm_config: Optional[LLMConfig] = None):
        """
        Initialize prompt handler.
        
        Args:
            config: API configuration
            router: API router for endpoint registration
            llm_config: LLM service configuration (uses mock if None)
        """
        super().__init__(config)
        self.router = router
        
        # Initialize LLM service
        if llm_config is None:
            llm_config = LLMConfig(provider="mock")
        self.llm = LLMService(llm_config)
        
        # In-memory storage for templates and chains
        self.templates: Dict[str, PromptTemplate] = {}
        self.chains: Dict[str, PromptChain] = {}
        
        # Register all endpoints
        self.register_endpoints()
        
        logger.info("Initialized PromptCategoryHandler with 10 endpoints")
    
    def register_endpoints(self) -> None:
        """Register all prompt engineering endpoints with the router."""
        
        # CRUD endpoints (5)
        self.router.register_endpoint(
            path="storycore.prompt.create",
            method="POST",
            handler=self.create,
            description="Create a new prompt template",
        )
        
        self.router.register_endpoint(
            path="storycore.prompt.list",
            method="GET",
            handler=self.list,
            description="List all prompt templates",
        )
        
        self.router.register_endpoint(
            path="storycore.prompt.get",
            method="GET",
            handler=self.get,
            description="Get a specific prompt template",
        )
        
        self.router.register_endpoint(
            path="storycore.prompt.update",
            method="PUT",
            handler=self.update,
            description="Update an existing prompt template",
        )
        
        self.router.register_endpoint(
            path="storycore.prompt.delete",
            method="DELETE",
            handler=self.delete,
            description="Delete a prompt template",
        )
        
        # Execution and optimization endpoints (3)
        self.router.register_endpoint(
            path="storycore.prompt.test",
            method="POST",
            handler=self.test,
            description="Test a prompt template with inputs",
        )
        
        self.router.register_endpoint(
            path="storycore.prompt.optimize",
            method="POST",
            handler=self.optimize,
            description="Optimize a prompt template",
        )
        
        self.router.register_endpoint(
            path="storycore.prompt.variables.extract",
            method="POST",
            handler=self.variables_extract,
            description="Extract variables from a prompt template",
        )
        
        # Chaining endpoints (2)
        self.router.register_endpoint(
            path="storycore.prompt.chain.create",
            method="POST",
            handler=self.chain_create,
            description="Create a prompt chain",
        )
        
        self.router.register_endpoint(
            path="storycore.prompt.chain.execute",
            method="POST",
            handler=self.chain_execute,
            description="Execute a prompt chain",
            async_capable=True,
        )
    
    # CRUD endpoints
    
    def create(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Create a new prompt template.
        
        Endpoint: storycore.prompt.create
        Requirements: 6.1
        """
        error = self.validate_required_params(params, ["name", "template"], context)
        if error:
            return error
        
        try:
            # Generate unique ID
            template_id = params.get("id", str(uuid.uuid4()))
            
            # Check if ID already exists
            if template_id in self.templates:
                return self.create_error_response(
                    error_code=ErrorCodes.CONFLICT,
                    message=f"Template with ID '{template_id}' already exists",
                    context=context,
                    remediation="Use a different ID or update the existing template",
                )
            
            # Extract variables from template
            variables = self._extract_variables(params["template"])
            
            # Create template
            template = PromptTemplate(
                id=template_id,
                name=params["name"],
                description=params.get("description", ""),
                template=params["template"],
                variables=variables,
                category=params.get("category"),
                tags=params.get("tags", []),
                created_at=datetime.now(),
                updated_at=datetime.now(),
                metadata=params.get("metadata", {}),
            )
            
            # Store template
            self.templates[template_id] = template
            
            data = {
                "id": template.id,
                "name": template.name,
                "description": template.description,
                "template": template.template,
                "variables": template.variables,
                "category": template.category,
                "tags": template.tags,
                "created_at": template.created_at.isoformat() if template.created_at else None,
                "metadata": template.metadata,
            }
            
            return self.create_success_response(data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def list(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        List all prompt templates.
        
        Endpoint: storycore.prompt.list
        Requirements: 6.2
        """
        try:
            # Optional filtering
            category = params.get("category")
            tags = params.get("tags", [])
            
            templates = []
            for template in self.templates.values():
                # Apply filters
                if category and template.category != category:
                    continue
                if tags and not any(tag in template.tags for tag in tags):
                    continue
                
                templates.append({
                    "id": template.id,
                    "name": template.name,
                    "description": template.description,
                    "category": template.category,
                    "tags": template.tags,
                    "variable_count": len(template.variables),
                    "created_at": template.created_at.isoformat() if template.created_at else None,
                    "updated_at": template.updated_at.isoformat() if template.updated_at else None,
                })
            
            data = {
                "templates": templates,
                "total_count": len(templates),
                "filters": {
                    "category": category,
                    "tags": tags,
                }
            }
            
            return self.create_success_response(data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def get(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Get a specific prompt template.
        
        Endpoint: storycore.prompt.get
        Requirements: 6.3
        """
        error = self.validate_required_params(params, ["id"], context)
        if error:
            return error
        
        try:
            template_id = params["id"]
            
            if template_id not in self.templates:
                return self.create_error_response(
                    error_code=ErrorCodes.NOT_FOUND,
                    message=f"Template with ID '{template_id}' not found",
                    context=context,
                    remediation="Check the template ID or list available templates",
                )
            
            template = self.templates[template_id]
            
            data = {
                "id": template.id,
                "name": template.name,
                "description": template.description,
                "template": template.template,
                "variables": template.variables,
                "category": template.category,
                "tags": template.tags,
                "created_at": template.created_at.isoformat() if template.created_at else None,
                "updated_at": template.updated_at.isoformat() if template.updated_at else None,
                "metadata": template.metadata,
            }
            
            return self.create_success_response(data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def update(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Update an existing prompt template.
        
        Endpoint: storycore.prompt.update
        Requirements: 6.4
        """
        error = self.validate_required_params(params, ["id"], context)
        if error:
            return error
        
        try:
            template_id = params["id"]
            
            if template_id not in self.templates:
                return self.create_error_response(
                    error_code=ErrorCodes.NOT_FOUND,
                    message=f"Template with ID '{template_id}' not found",
                    context=context,
                    remediation="Check the template ID or create a new template",
                )
            
            template = self.templates[template_id]
            
            # Update fields
            if "name" in params:
                template.name = params["name"]
            if "description" in params:
                template.description = params["description"]
            if "template" in params:
                template.template = params["template"]
                template.variables = self._extract_variables(params["template"])
            if "category" in params:
                template.category = params["category"]
            if "tags" in params:
                template.tags = params["tags"]
            if "metadata" in params:
                template.metadata = params["metadata"]
            
            template.updated_at = datetime.now()
            
            data = {
                "id": template.id,
                "name": template.name,
                "description": template.description,
                "template": template.template,
                "variables": template.variables,
                "category": template.category,
                "tags": template.tags,
                "updated_at": template.updated_at.isoformat() if template.updated_at else None,
                "metadata": template.metadata,
            }
            
            return self.create_success_response(data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def delete(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Delete a prompt template.
        
        Endpoint: storycore.prompt.delete
        Requirements: 6.5
        """
        error = self.validate_required_params(params, ["id"], context)
        if error:
            return error
        
        try:
            template_id = params["id"]
            
            if template_id not in self.templates:
                return self.create_error_response(
                    error_code=ErrorCodes.NOT_FOUND,
                    message=f"Template with ID '{template_id}' not found",
                    context=context,
                    remediation="Check the template ID",
                )
            
            # Remove template
            deleted_template = self.templates.pop(template_id)
            
            data = {
                "id": deleted_template.id,
                "name": deleted_template.name,
                "deleted": True,
            }
            
            return self.create_success_response(data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    # Execution and optimization endpoints
    
    def test(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Test a prompt template with inputs.
        
        Endpoint: storycore.prompt.test
        Requirements: 6.6
        """
        error = self.validate_required_params(params, ["template", "inputs"], context)
        if error:
            return error
        
        try:
            template = params["template"]
            inputs = params["inputs"]
            
            # If template is an ID, load it
            if isinstance(template, str) and template in self.templates:
                template_obj = self.templates[template]
                template_text = template_obj.template
                template_id = template_obj.id
            else:
                template_text = template
                template_id = "inline"
            
            # Fill template with inputs
            filled_prompt = self._fill_template(template_text, inputs)
            
            # Execute prompt
            start_time = datetime.now()
            result = self.llm.complete(
                filled_prompt,
                temperature=params.get("temperature", 0.7),
                max_tokens=params.get("max_tokens", 1000),
            )
            execution_time = (datetime.now() - start_time).total_seconds() * 1000
            
            data = {
                "template_id": template_id,
                "inputs": inputs,
                "filled_prompt": filled_prompt,
                "output": result,
                "success": True,
                "execution_time_ms": execution_time,
                "metadata": {
                    "model": self.llm.config.provider,
                }
            }
            
            return self.create_success_response(data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def optimize(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Optimize a prompt template.
        
        Endpoint: storycore.prompt.optimize
        Requirements: 6.7
        """
        error = self.validate_required_params(params, ["template"], context)
        if error:
            return error
        
        try:
            template = params["template"]
            
            # If template is an ID, load it
            if isinstance(template, str) and template in self.templates:
                template_obj = self.templates[template]
                template_text = template_obj.template
            else:
                template_text = template
            
            # Use LLM to optimize the prompt
            system_prompt = "You are a prompt engineering expert. Optimize prompts for clarity, specificity, and effectiveness."
            optimization_prompt = f"""Optimize this prompt template for better LLM results:

{template_text}

Return a JSON object with:
- original_template: the original template
- optimized_template: the improved template
- improvements: list of specific improvements made
- expected_improvement: estimated quality gain (0-1)
- reasoning: explanation of changes"""
            
            result = self.llm.complete_json(optimization_prompt, system_prompt=system_prompt)
            
            # Ensure we have the required fields
            if "optimized_template" not in result:
                result["optimized_template"] = template_text
            if "improvements" not in result:
                result["improvements"] = []
            
            return self.create_success_response(result, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def variables_extract(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Extract variables from a prompt template.
        
        Endpoint: storycore.prompt.variables.extract
        Requirements: 6.8
        """
        error = self.validate_required_params(params, ["template"], context)
        if error:
            return error
        
        try:
            template = params["template"]
            
            # If template is an ID, load it
            if isinstance(template, str) and template in self.templates:
                template_obj = self.templates[template]
                template_text = template_obj.template
            else:
                template_text = template
            
            # Extract variables
            variables = self._extract_variables(template_text)
            
            # Build detailed variable information
            variable_details = []
            for var in variables:
                variable_details.append({
                    "name": var,
                    "type": "string",  # Default type
                    "required": True,  # Assume all are required
                    "description": f"Variable: {var}",
                })
            
            data = {
                "template": template_text,
                "variables": variables,
                "variable_details": variable_details,
                "variable_count": len(variables),
            }
            
            return self.create_success_response(data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    # Chaining endpoints
    
    def chain_create(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Create a prompt chain.
        
        Endpoint: storycore.prompt.chain.create
        Requirements: 6.9
        """
        error = self.validate_required_params(params, ["name", "steps"], context)
        if error:
            return error
        
        try:
            # Generate unique ID
            chain_id = params.get("id", str(uuid.uuid4()))
            
            # Check if ID already exists
            if chain_id in self.chains:
                return self.create_error_response(
                    error_code=ErrorCodes.CONFLICT,
                    message=f"Chain with ID '{chain_id}' already exists",
                    context=context,
                    remediation="Use a different ID or update the existing chain",
                )
            
            # Validate steps
            steps = params["steps"]
            if not isinstance(steps, list) or len(steps) == 0:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message="Steps must be a non-empty list",
                    context=context,
                    remediation="Provide at least one step in the chain",
                )
            
            # Create chain
            chain = PromptChain(
                id=chain_id,
                name=params["name"],
                description=params.get("description", ""),
                steps=steps,
                created_at=datetime.now(),
                updated_at=datetime.now(),
                metadata=params.get("metadata", {}),
            )
            
            # Store chain
            self.chains[chain_id] = chain
            
            data = {
                "id": chain.id,
                "name": chain.name,
                "description": chain.description,
                "steps": chain.steps,
                "step_count": len(chain.steps),
                "created_at": chain.created_at.isoformat() if chain.created_at else None,
                "metadata": chain.metadata,
            }
            
            return self.create_success_response(data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    def chain_execute(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Execute a prompt chain.
        
        Endpoint: storycore.prompt.chain.execute
        Requirements: 6.10
        """
        error = self.validate_required_params(params, ["chain_id"], context)
        if error:
            return error
        
        try:
            chain_id = params["chain_id"]
            initial_inputs = params.get("inputs", {})
            
            if chain_id not in self.chains:
                return self.create_error_response(
                    error_code=ErrorCodes.NOT_FOUND,
                    message=f"Chain with ID '{chain_id}' not found",
                    context=context,
                    remediation="Check the chain ID or create a new chain",
                )
            
            chain = self.chains[chain_id]
            
            # Execute chain steps
            start_time = datetime.now()
            step_results = []
            current_data = initial_inputs.copy()
            
            for i, step in enumerate(chain.steps):
                step_start = datetime.now()
                
                # Get template
                template_id = step.get("template_id")
                if not template_id or template_id not in self.templates:
                    return self.create_error_response(
                        error_code=ErrorCodes.VALIDATION_ERROR,
                        message=f"Step {i}: Invalid template_id '{template_id}'",
                        context=context,
                        remediation="Ensure all steps reference valid template IDs",
                    )
                
                template = self.templates[template_id]
                
                # Prepare inputs for this step
                step_inputs = step.get("inputs", {})
                # Merge with current data
                merged_inputs = {**current_data, **step_inputs}
                
                # Fill and execute template
                filled_prompt = self._fill_template(template.template, merged_inputs)
                result = self.llm.complete(filled_prompt)
                
                step_duration = (datetime.now() - step_start).total_seconds() * 1000
                
                # Store result
                step_result = {
                    "step": i,
                    "template_id": template_id,
                    "template_name": template.name,
                    "inputs": merged_inputs,
                    "output": result,
                    "execution_time_ms": step_duration,
                }
                step_results.append(step_result)
                
                # Map output to next step's input
                output_mapping = step.get("output_mapping", {})
                for output_key, input_key in output_mapping.items():
                    if output_key == "output":
                        current_data[input_key] = result
                    else:
                        # Could support more complex mappings
                        pass
                
                # Also store output with step name
                current_data[f"step_{i}_output"] = result
            
            total_time = (datetime.now() - start_time).total_seconds() * 1000
            
            data = {
                "chain_id": chain_id,
                "chain_name": chain.name,
                "steps_executed": len(step_results),
                "step_results": step_results,
                "final_output": step_results[-1]["output"] if step_results else None,
                "success": True,
                "total_execution_time_ms": total_time,
            }
            
            return self.create_success_response(data, context)
            
        except Exception as e:
            return self.handle_exception(e, context)
    
    # Helper methods
    
    def _extract_variables(self, template: str) -> List[str]:
        """
        Extract variable names from a template.
        
        Supports formats: {variable}, {{variable}}, ${variable}
        
        Args:
            template: Template string
            
        Returns:
            List of unique variable names
        """
        # Match {variable}, {{variable}}, ${variable}
        patterns = [
            r'\{([a-zA-Z_][a-zA-Z0-9_]*)\}',
            r'\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}',
            r'\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}',
        ]
        
        variables = set()
        for pattern in patterns:
            matches = re.findall(pattern, template)
            variables.update(matches)
        
        return sorted(list(variables))
    
    def _fill_template(self, template: str, inputs: Dict[str, Any]) -> str:
        """
        Fill a template with input values.
        
        Args:
            template: Template string
            inputs: Dictionary of variable values
            
        Returns:
            Filled template string
        """
        result = template
        
        # Replace {variable}, {{variable}}, ${variable}
        for key, value in inputs.items():
            result = result.replace(f"{{{key}}}", str(value))
            result = result.replace(f"{{{{{key}}}}}", str(value))
            result = result.replace(f"${{{key}}}", str(value))
        
        return result
