"""
Code Examples Generator

This module generates code examples for API endpoints in multiple languages.
"""

import json
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

from .router import APIRouter, EndpointDefinition


@dataclass
class CodeExample:
    """A code example in a specific language."""
    language: str
    code: str
    description: str


class CodeExamplesGenerator:
    """
    Generates code examples for API endpoints in multiple languages.
    
    Supports:
    - Python (using requests library)
    - JavaScript (using fetch API)
    - cURL (command-line)
    """
    
    def __init__(self, router: APIRouter, base_url: str = "http://localhost:8000"):
        """
        Initialize the code examples generator.
        
        Args:
            router: API router with registered endpoints
            base_url: Base URL for API requests
        """
        self.router = router
        self.base_url = base_url
    
    def generate_examples_for_endpoint(
        self,
        endpoint: EndpointDefinition,
        params: Optional[Dict[str, Any]] = None,
    ) -> List[CodeExample]:
        """
        Generate code examples for a specific endpoint.
        
        Args:
            endpoint: Endpoint definition
            params: Example parameters (auto-generated if not provided)
            
        Returns:
            List of code examples in different languages
        """
        if params is None:
            params = self._generate_example_params(endpoint)
        
        examples = []
        
        # Generate Python example
        examples.append(self._generate_python_example(endpoint, params))
        
        # Generate JavaScript example
        examples.append(self._generate_javascript_example(endpoint, params))
        
        # Generate cURL example
        examples.append(self._generate_curl_example(endpoint, params))
        
        return examples
    
    def generate_all_examples(self) -> Dict[str, List[CodeExample]]:
        """
        Generate examples for all registered endpoints.
        
        Returns:
            Dictionary mapping endpoint paths to code examples
        """
        all_examples = {}
        
        for endpoint in self.router.list_endpoints():
            examples = self.generate_examples_for_endpoint(endpoint)
            all_examples[endpoint.path] = examples
        
        return all_examples
    
    def generate_examples_for_category(self, category: str) -> Dict[str, List[CodeExample]]:
        """
        Generate examples for all endpoints in a category.
        
        Args:
            category: Category name (e.g., "narration", "pipeline")
            
        Returns:
            Dictionary mapping endpoint paths to code examples
        """
        category_examples = {}
        
        for endpoint in self.router.list_endpoints():
            if self._extract_category(endpoint.path).lower() == category.lower():
                examples = self.generate_examples_for_endpoint(endpoint)
                category_examples[endpoint.path] = examples
        
        return category_examples
    
    def export_examples_json(self, output_path: str) -> None:
        """
        Export all examples to a JSON file.
        
        Args:
            output_path: Path to output JSON file
        """
        all_examples = self.generate_all_examples()
        
        # Convert to serializable format
        serializable = {}
        for path, examples in all_examples.items():
            serializable[path] = [
                {
                    "language": ex.language,
                    "code": ex.code,
                    "description": ex.description,
                }
                for ex in examples
            ]
        
        with open(output_path, 'w') as f:
            json.dump(serializable, f, indent=2)
    
    def export_examples_markdown(self, output_path: str) -> None:
        """
        Export all examples to a Markdown file.
        
        Args:
            output_path: Path to output Markdown file
        """
        all_examples = self.generate_all_examples()
        
        # Group by category
        by_category = {}
        for path, examples in all_examples.items():
            category = self._extract_category(path)
            if category not in by_category:
                by_category[category] = []
            by_category[category].append((path, examples))
        
        # Generate markdown
        lines = [
            "# StoryCore API Code Examples",
            "",
            "This document provides code examples for all StoryCore API endpoints.",
            "",
        ]
        
        for category in sorted(by_category.keys()):
            lines.append(f"## {category}")
            lines.append("")
            
            for path, examples in by_category[category]:
                lines.append(f"### {path}")
                lines.append("")
                
                for example in examples:
                    lines.append(f"#### {example.language}")
                    lines.append("")
                    lines.append(example.description)
                    lines.append("")
                    lines.append(f"```{self._get_language_code(example.language)}")
                    lines.append(example.code)
                    lines.append("```")
                    lines.append("")
        
        with open(output_path, 'w') as f:
            f.write('\n'.join(lines))
    
    def _generate_python_example(
        self,
        endpoint: EndpointDefinition,
        params: Dict[str, Any],
    ) -> CodeExample:
        """Generate Python example using requests library."""
        url = f"{self.base_url}/{endpoint.path}"
        
        # Build code
        lines = ["import requests"]
        
        if endpoint.async_capable:
            lines.append("import time")
        
        lines.append("")
        
        # Add authentication if required
        if endpoint.requires_auth:
            lines.append("# Authentication")
            lines.append('headers = {"Authorization": "Bearer YOUR_TOKEN"}')
            lines.append("")
        
        # Synchronous request
        lines.append("# Make request")
        request_code = f'response = requests.{endpoint.method.lower()}(\n'
        request_code += f'    "{url}",\n'
        
        if endpoint.method in ["POST", "PUT", "PATCH"]:
            request_code += f'    json={json.dumps(params, indent=4)}'
            if endpoint.requires_auth:
                request_code += ',\n    headers=headers'
        elif endpoint.requires_auth:
            request_code += '    headers=headers'
        
        request_code += '\n)'
        lines.append(request_code)
        lines.append("")
        
        # Handle response
        if endpoint.async_capable:
            lines.append("# Check if async operation")
            lines.append("data = response.json()")
            lines.append('if data["status"] == "pending":')
            lines.append('    task_id = data["data"]["task_id"]')
            lines.append('    print(f"Task initiated: {task_id}")')
            lines.append("    ")
            lines.append("    # Poll for completion")
            lines.append("    while True:")
            lines.append("        status_response = requests.post(")
            lines.append(f'            "{self.base_url}/storycore.task.status",')
            lines.append('            json={"task_id": task_id}')
            if endpoint.requires_auth:
                lines.append(',            headers=headers')
            lines.append("        )")
            lines.append("        status_data = status_response.json()")
            lines.append('        ')
            lines.append('        if status_data["data"]["status"] == "completed":')
            lines.append('            result = status_data["data"]["result"]')
            lines.append('            print("Task completed:", result)')
            lines.append("            break")
            lines.append('        elif status_data["data"]["status"] == "failed":')
            lines.append('            print("Task failed:", status_data["data"]["error"])')
            lines.append("            break")
            lines.append("        ")
            lines.append("        time.sleep(1)")
            lines.append("else:")
            lines.append("    # Synchronous response")
            lines.append('    print("Result:", data["data"])')
        else:
            lines.append("# Handle response")
            lines.append("data = response.json()")
            lines.append('if data["status"] == "success":')
            lines.append('    print("Result:", data["data"])')
            lines.append("else:")
            lines.append('    print("Error:", data["error"])')
        
        code = '\n'.join(lines)
        description = self._get_python_description(endpoint)
        
        return CodeExample(
            language="Python",
            code=code,
            description=description,
        )
    
    def _generate_javascript_example(
        self,
        endpoint: EndpointDefinition,
        params: Dict[str, Any],
    ) -> CodeExample:
        """Generate JavaScript example using fetch API."""
        url = f"{self.base_url}/{endpoint.path}"
        
        # Build code
        lines = []
        
        # Add authentication if required
        if endpoint.requires_auth:
            lines.append("// Authentication")
            lines.append("const headers = {")
            lines.append('  "Content-Type": "application/json",')
            lines.append('  "Authorization": "Bearer YOUR_TOKEN"')
            lines.append("};")
            lines.append("")
        else:
            lines.append("const headers = {")
            lines.append('  "Content-Type": "application/json"')
            lines.append("};")
            lines.append("")
        
        # Make request
        lines.append("// Make request")
        lines.append(f'const response = await fetch("{url}", {{')
        lines.append(f'  method: "{endpoint.method}",')
        lines.append("  headers: headers,")
        
        if endpoint.method in ["POST", "PUT", "PATCH"]:
            lines.append(f"  body: JSON.stringify({json.dumps(params, indent=4)})")
        
        lines.append("});")
        lines.append("")
        
        # Handle response
        lines.append("const data = await response.json();")
        lines.append("")
        
        if endpoint.async_capable:
            lines.append("// Check if async operation")
            lines.append('if (data.status === "pending") {')
            lines.append("  const taskId = data.data.task_id;")
            lines.append('  console.log(`Task initiated: ${taskId}`);')
            lines.append("  ")
            lines.append("  // Poll for completion")
            lines.append("  while (true) {")
            lines.append(f'    const statusResponse = await fetch("{self.base_url}/storycore.task.status", {{')
            lines.append('      method: "POST",')
            lines.append("      headers: headers,")
            lines.append("      body: JSON.stringify({ task_id: taskId })")
            lines.append("    });")
            lines.append("    ")
            lines.append("    const statusData = await statusResponse.json();")
            lines.append("    ")
            lines.append('    if (statusData.data.status === "completed") {')
            lines.append("      console.log('Task completed:', statusData.data.result);")
            lines.append("      break;")
            lines.append('    } else if (statusData.data.status === "failed") {')
            lines.append("      console.log('Task failed:', statusData.data.error);")
            lines.append("      break;")
            lines.append("    }")
            lines.append("    ")
            lines.append("    await new Promise(resolve => setTimeout(resolve, 1000));")
            lines.append("  }")
            lines.append("} else {")
            lines.append("  // Synchronous response")
            lines.append("  console.log('Result:', data.data);")
            lines.append("}")
        else:
            lines.append("// Handle response")
            lines.append('if (data.status === "success") {')
            lines.append("  console.log('Result:', data.data);")
            lines.append("} else {")
            lines.append("  console.log('Error:', data.error);")
            lines.append("}")
        
        code = '\n'.join(lines)
        description = self._get_javascript_description(endpoint)
        
        return CodeExample(
            language="JavaScript",
            code=code,
            description=description,
        )
    
    def _generate_curl_example(
        self,
        endpoint: EndpointDefinition,
        params: Dict[str, Any],
    ) -> CodeExample:
        """Generate cURL command-line example."""
        url = f"{self.base_url}/{endpoint.path}"
        
        # Build command
        parts = [f"curl -X {endpoint.method}"]
        parts.append(f'"{url}"')
        
        # Add headers
        parts.append('-H "Content-Type: application/json"')
        
        if endpoint.requires_auth:
            parts.append('-H "Authorization: Bearer YOUR_TOKEN"')
        
        # Add data for POST/PUT/PATCH
        if endpoint.method in ["POST", "PUT", "PATCH"]:
            json_data = json.dumps(params)
            # Escape single quotes for shell
            json_data = json_data.replace("'", "'\\''")
            parts.append(f"-d '{json_data}'")
        
        # Join with line continuations
        code = " \\\n  ".join(parts)
        
        description = self._get_curl_description(endpoint)
        
        return CodeExample(
            language="cURL",
            code=code,
            description=description,
        )
    
    def _generate_example_params(self, endpoint: EndpointDefinition) -> Dict[str, Any]:
        """Generate example parameters for an endpoint."""
        # Use schema if available
        if endpoint.schema and "properties" in endpoint.schema:
            params = {}
            for prop_name, prop_schema in endpoint.schema["properties"].items():
                params[prop_name] = self._generate_example_value(prop_schema)
            return params
        
        # Generate based on endpoint path
        if "narration.generate" in endpoint.path:
            return {
                "prompt": "A hero embarks on a quest to save their village",
                "options": {"genre": "fantasy", "tone": "epic"}
            }
        elif "pipeline.init" in endpoint.path:
            return {
                "project_name": "my-story",
                "path": "/path/to/projects"
            }
        elif "image.generate" in endpoint.path:
            return {
                "prompt": "A mystical forest at twilight",
                "width": 1024,
                "height": 1024
            }
        elif "memory.store" in endpoint.path:
            return {
                "key": "character_name",
                "value": "Aria the Brave"
            }
        elif "task.status" in endpoint.path:
            return {"task_id": "task_abc123"}
        else:
            return {}
    
    def _generate_example_value(self, schema: Dict[str, Any]) -> Any:
        """Generate an example value from a JSON schema."""
        schema_type = schema.get("type", "string")
        
        if "example" in schema:
            return schema["example"]
        elif schema_type == "string":
            return "example_value"
        elif schema_type == "integer":
            return 42
        elif schema_type == "number":
            return 3.14
        elif schema_type == "boolean":
            return True
        elif schema_type == "array":
            return []
        elif schema_type == "object":
            return {}
        else:
            return None
    
    def _get_python_description(self, endpoint: EndpointDefinition) -> str:
        """Get description for Python example."""
        desc = f"Python example for {endpoint.path}"
        if endpoint.async_capable:
            desc += " (with async task polling)"
        if endpoint.requires_auth:
            desc += " (with authentication)"
        return desc
    
    def _get_javascript_description(self, endpoint: EndpointDefinition) -> str:
        """Get description for JavaScript example."""
        desc = f"JavaScript example for {endpoint.path}"
        if endpoint.async_capable:
            desc += " (with async task polling)"
        if endpoint.requires_auth:
            desc += " (with authentication)"
        return desc
    
    def _get_curl_description(self, endpoint: EndpointDefinition) -> str:
        """Get description for cURL example."""
        desc = f"cURL example for {endpoint.path}"
        if endpoint.requires_auth:
            desc += " (with authentication)"
        return desc
    
    def _get_language_code(self, language: str) -> str:
        """Get language code for markdown code blocks."""
        mapping = {
            "Python": "python",
            "JavaScript": "javascript",
            "cURL": "bash",
        }
        return mapping.get(language, language.lower())
    
    def _extract_category(self, path: str) -> str:
        """Extract category name from endpoint path."""
        parts = path.split(".")
        if len(parts) >= 2:
            category = parts[1]
            return category.replace("_", " ").title()
        return "General"
