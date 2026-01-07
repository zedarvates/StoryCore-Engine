"""
JSON validation logic for StoryCore-Engine data contracts.
"""

import json
from pathlib import Path
from typing import Dict, Any, List
from schemas import PROJECT_SCHEMA, STORYBOARD_SCHEMA, QA_REPORT_SCHEMA


class ValidationError(Exception):
    """Custom exception for validation errors."""
    pass


class Validator:
    """Handles JSON validation without external dependencies."""
    
    def validate_project(self, project_path: str) -> bool:
        """Validate project.json against schema."""
        try:
            with open(project_path, 'r') as f:
                data = json.load(f)
            
            self._validate_against_schema(data, PROJECT_SCHEMA, "project.json")
            return True
            
        except FileNotFoundError:
            raise ValidationError(f"Project file not found: {project_path}")
        except json.JSONDecodeError as e:
            raise ValidationError(f"Invalid JSON in project file: {e}")
    
    def validate_storyboard(self, storyboard_path: str) -> bool:
        """Validate storyboard.json against schema."""
        try:
            with open(storyboard_path, 'r') as f:
                data = json.load(f)
            
            self._validate_against_schema(data, STORYBOARD_SCHEMA, "storyboard.json")
            return True
            
        except FileNotFoundError:
            raise ValidationError(f"Storyboard file not found: {storyboard_path}")
        except json.JSONDecodeError as e:
            raise ValidationError(f"Invalid JSON in storyboard file: {e}")
    
    def validate_qa_report(self, qa_report_path: str) -> bool:
        """Validate qa_report.json against schema."""
        try:
            with open(qa_report_path, 'r') as f:
                data = json.load(f)
            
            self._validate_against_schema(data, QA_REPORT_SCHEMA, "qa_report.json")
            return True
            
        except FileNotFoundError:
            raise ValidationError(f"QA report file not found: {qa_report_path}")
        except json.JSONDecodeError as e:
            raise ValidationError(f"Invalid JSON in QA report file: {e}")
    
    def validate_project_directory(self, project_dir: str) -> Dict[str, bool]:
        """Validate all JSON files in a project directory."""
        project_path = Path(project_dir)
        results = {}
        
        # Check project.json
        project_file = project_path / "project.json"
        try:
            results["project.json"] = self.validate_project(str(project_file))
        except ValidationError as e:
            results["project.json"] = f"FAILED: {e}"
        
        # Check storyboard.json
        storyboard_file = project_path / "storyboard.json"
        try:
            results["storyboard.json"] = self.validate_storyboard(str(storyboard_file))
        except ValidationError as e:
            results["storyboard.json"] = f"FAILED: {e}"
        
        return results
    
    def _validate_against_schema(self, data: Dict[str, Any], schema: Dict[str, Any], filename: str) -> None:
        """Simple schema validation without external dependencies."""
        # Check required fields
        required_fields = schema.get("required", [])
        for field in required_fields:
            if field not in data:
                raise ValidationError(f"Missing required field '{field}' in {filename}")
        
        # Check nested required fields
        properties = schema.get("properties", {})
        for field_name, field_schema in properties.items():
            if field_name in data:
                self._validate_field(data[field_name], field_schema, f"{filename}.{field_name}")
    
    def _validate_field(self, value: Any, field_schema: Dict[str, Any], field_path: str) -> None:
        """Validate a single field against its schema."""
        expected_type = field_schema.get("type")
        
        # Type validation
        if expected_type == "string" and not isinstance(value, str):
            raise ValidationError(f"Field '{field_path}' must be a string")
        elif expected_type == "integer" and not isinstance(value, int):
            raise ValidationError(f"Field '{field_path}' must be an integer")
        elif expected_type == "number" and not isinstance(value, (int, float)):
            raise ValidationError(f"Field '{field_path}' must be a number")
        elif expected_type == "boolean" and not isinstance(value, bool):
            raise ValidationError(f"Field '{field_path}' must be a boolean")
        elif expected_type == "array" and not isinstance(value, list):
            raise ValidationError(f"Field '{field_path}' must be an array")
        elif expected_type == "object" and not isinstance(value, dict):
            raise ValidationError(f"Field '{field_path}' must be an object")
        
        # Nested object validation
        if expected_type == "object" and isinstance(value, dict):
            required_fields = field_schema.get("required", [])
            for req_field in required_fields:
                if req_field not in value:
                    raise ValidationError(f"Missing required field '{req_field}' in {field_path}")
            
            # Recursively validate nested properties
            nested_properties = field_schema.get("properties", {})
            for nested_field, nested_schema in nested_properties.items():
                if nested_field in value:
                    self._validate_field(value[nested_field], nested_schema, f"{field_path}.{nested_field}")
        
        # Array validation
        if expected_type == "array" and isinstance(value, list):
            items_schema = field_schema.get("items")
            if items_schema:
                for i, item in enumerate(value):
                    self._validate_field(item, items_schema, f"{field_path}[{i}]")
