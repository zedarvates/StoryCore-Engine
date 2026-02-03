"""
Variables Manager for StoryCore LLM Memory System.

This module handles project variables and parameters management.
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime
import uuid

from .data_models import (
    Variables,
    Variable,
)
from .schemas import VARIABLES_SCHEMA, validate_schema
from .build_logger import BuildLogger


class VariablesManager:
    """
    Manages project variables and parameters.
    
    Responsibilities:
    - Maintain variables.json with key-value pairs
    - Validate data types and values
    - Support string, number, boolean, and array types
    - Log all variable changes
    - Provide structured format for LLM access
    
    Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5
    """
    
    VARIABLES_FILENAME = "variables.json"
    
    SUPPORTED_TYPES = ['string', 'number', 'boolean', 'array', 'object']
    
    def __init__(self, project_path: Path):
        """
        Initialize the VariablesManager.
        
        Args:
            project_path: Root path for the project
        """
        self.project_path = Path(project_path)
        self.variables_path = self.project_path / "assistant" / self.VARIABLES_FILENAME
        self.build_logger = BuildLogger(project_path)
    
    def load_variables(self) -> Optional[Variables]:
        """
        Load variables from variables.json.
        
        Returns:
            Variables object if successful, None if file doesn't exist or is invalid
        """
        if not self.variables_path.exists():
            return None
        
        try:
            with open(self.variables_path, 'r', encoding='utf-8') as f:
                variables_data = json.load(f)
            
            # Validate against schema
            is_valid, errors = validate_schema(variables_data, VARIABLES_SCHEMA)
            if not is_valid:
                print(f"Variables validation failed: {errors}")
                return None
            
            # Parse into Variables object
            return self._parse_variables_data(variables_data)
            
        except json.JSONDecodeError as e:
            print(f"Invalid JSON in variables file: {e}")
            return None
        except Exception as e:
            print(f"Error loading variables: {e}")
            return None
    
    def _parse_variables_data(self, data: Dict[str, Any]) -> Variables:
        """Parse variables data dictionary into Variables object."""
        variables = {}
        
        for name, var_data in data.get('variables', {}).items():
            variables[name] = Variable(
                value=var_data.get('value'),
                type=var_data.get('type', 'string'),
                description=var_data.get('description', ''),
                last_modified=var_data.get('last_modified', datetime.now().isoformat())
            )
        
        return Variables(
            schema_version=data.get('schema_version', '1.0'),
            last_updated=data.get('last_updated', datetime.now().isoformat()),
            variables=variables
        )
    
    def save_variables(self, variables: Variables) -> bool:
        """
        Save variables to variables.json with validation.
        
        Args:
            variables: Variables object to save
            
        Returns:
            True if saved successfully, False otherwise
        """
        try:
            # Update timestamp
            variables.last_updated = datetime.now().isoformat()
            
            # Convert to dictionary
            variables_dict = variables.to_dict()
            
            # Validate against schema
            is_valid, errors = validate_schema(variables_dict, VARIABLES_SCHEMA)
            if not is_valid:
                print(f"Variables validation failed: {errors}")
                return False
            
            # Ensure parent directory exists
            self.variables_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Write to file
            with open(self.variables_path, 'w', encoding='utf-8') as f:
                json.dump(variables_dict, f, indent=2, ensure_ascii=False)
            
            return True
            
        except Exception as e:
            print(f"Error saving variables: {e}")
            return False
    
    def set_variable(
        self,
        name: str,
        value: Any,
        var_type: Optional[str] = None,
        description: str = "",
        trigger_log: bool = True
    ) -> bool:
        """
        Set a variable value.
        
        Args:
            name: Variable name
            value: Variable value
            var_type: Variable type (auto-detected if not provided)
            description: Variable description
            trigger_log: Whether to log the change
            
        Returns:
            True if set successfully, False otherwise
            
        Validates: Requirements 15.2, 15.3
        """
        # Auto-detect type if not provided
        if var_type is None:
            var_type = self._detect_type(value)
        
        # Validate type
        if var_type not in self.SUPPORTED_TYPES:
            print(f"Unsupported variable type: {var_type}")
            return False
        
        # Validate value type matches
        if not self._validate_value_type(value, var_type):
            print(f"Value type mismatch for variable {name}")
            return False
        
        # Load current variables
        variables = self.load_variables()
        if variables is None:
            # Create new variables
            variables = Variables()
        
        # Get old value for logging
        old_value = None
        if name in variables.variables:
            old_value = variables.variables[name].value
        
        # Create or update variable
        variables.variables[name] = Variable(
            value=value,
            type=var_type,
            description=description,
            last_modified=datetime.now().isoformat()
        )
        
        # Save
        if not self.save_variables(variables):
            return False
        
        # Log change
        if trigger_log and old_value is not None:
            self.build_logger.log_variable_change(
                variable_name=name,
                old_value=old_value,
                new_value=value,
                triggered_by="variables_manager"
            )
        
        return True
    
    def _detect_type(self, value: Any) -> str:
        """Detect the type of a value."""
        if isinstance(value, bool):
            return 'boolean'
        elif isinstance(value, (int, float)):
            return 'number'
        elif isinstance(value, list):
            return 'array'
        elif isinstance(value, dict):
            return 'object'
        else:
            return 'string'
    
    def _validate_value_type(self, value: Any, expected_type: str) -> bool:
        """Validate that a value matches the expected type."""
        if expected_type == 'string':
            return isinstance(value, str)
        elif expected_type == 'number':
            return isinstance(value, (int, float))
        elif expected_type == 'boolean':
            return isinstance(value, bool)
        elif expected_type == 'array':
            return isinstance(value, list)
        elif expected_type == 'object':
            return isinstance(value, dict)
        else:
            return False
    
    def get_variable(self, name: str) -> Optional[Variable]:
        """
        Get a variable by name.
        
        Args:
            name: Variable name
            
        Returns:
            Variable object if found, None otherwise
        """
        variables = self.load_variables()
        if variables is None:
            return None
        
        return variables.variables.get(name)
    
    def get_value(self, name: str, default: Any = None) -> Any:
        """
        Get a variable value with default.
        
        Args:
            name: Variable name
            default: Default value if variable not found
            
        Returns:
            Variable value or default
        """
        variable = self.get_variable(name)
        if variable is None:
            return default
        return variable.value
    
    def delete_variable(self, name: str) -> bool:
        """
        Delete a variable.
        
        Args:
            name: Variable name to delete
            
        Returns:
            True if deleted successfully, False otherwise
        """
        variables = self.load_variables()
        if variables is None:
            return False
        
        if name not in variables.variables:
            return False
        
        # Get old value for logging
        old_value = variables.variables[name].value
        
        # Delete
        del variables.variables[name]
        
        if not self.save_variables(variables):
            return False
        
        # Log deletion
        self.build_logger.log_variable_change(
            variable_name=name,
            old_value=old_value,
            new_value="<deleted>",
            triggered_by="variables_manager"
        )
        
        return True
    
    def list_variables(self) -> Dict[str, Dict[str, Any]]:
        """
        List all variables with their metadata.
        
        Returns:
            Dictionary of variable names to their metadata
        
        Validates: Requirement 15.5
        """
        variables = self.load_variables()
        if variables is None:
            return {}
        
        result = {}
        for name, var in variables.variables.items():
            result[name] = {
                "value": var.value,
                "type": var.type,
                "description": var.description,
                "last_modified": var.last_modified
            }
        
        return result
    
    def get_variables_for_llm(self) -> str:
        """
        Get variables in a structured format for LLM consumption.
        
        Returns:
            Formatted variables string
            
        Validates: Requirement 15.5
        """
        variables = self.load_variables()
        if variables is None or not variables.variables:
            return "No variables defined."
        
        lines = []
        lines.append("=== PROJECT VARIABLES ===")
        lines.append(f"Last Updated: {variables.last_updated}")
        lines.append("")
        
        for name, var in variables.variables.items():
            lines.append(f"--- {name} ---")
            lines.append(f"  Type: {var.type}")
            lines.append(f"  Value: {self._format_value(var.value)}")
            if var.description:
                lines.append(f"  Description: {var.description}")
            lines.append(f"  Modified: {var.last_modified}")
            lines.append("")
        
        return "\n".join(lines)
    
    def _format_value(self, value: Any) -> str:
        """Format a value for display."""
        if isinstance(value, list):
            if len(value) <= 5:
                return str(value)
            else:
                return f"[{value[0]}, {value[1]}, ... ({len(value)} items)]"
        elif isinstance(value, dict):
            keys = list(value.keys())
            if len(keys) <= 5:
                return str(value)
            else:
                return f"{{{keys[0]}, {keys[1]}, ... ({len(keys)} keys)}}"
        else:
            return str(value)
    
    def increment_counter(self, name: str, amount: int = 1) -> Optional[int]:
        """
        Increment a numeric variable.
        
        Args:
            name: Variable name
            amount: Amount to increment by
            
        Returns:
            New value if successful, None otherwise
        """
        current = self.get_value(name, 0)
        
        if not isinstance(current, (int, float)):
            print(f"Variable {name} is not a number")
            return None
        
        new_value = current + amount
        
        if self.set_variable(name, new_value, 'number'):
            return new_value
        
        return None
    
    def append_to_list(self, name: str, item: Any) -> Optional[List[Any]]:
        """
        Append an item to a list variable.
        
        Args:
            name: Variable name
            item: Item to append
            
        Returns:
            New list if successful, None otherwise
        """
        current = self.get_value(name, [])
        
        if not isinstance(current, list):
            print(f"Variable {name} is not a list")
            return None
        
        current.append(item)
        
        if self.set_variable(name, current, 'array'):
            return current
        
        return None
    
    def remove_from_list(self, name: str, item: Any) -> Optional[List[Any]]:
        """
        Remove an item from a list variable.
        
        Args:
            name: Variable name
            item: Item to remove
            
        Returns:
            New list if successful, None otherwise
        """
        current = self.get_value(name, [])
        
        if not isinstance(current, list):
            print(f"Variable {name} is not a list")
            return None
        
        if item in current:
            current.remove(item)
        else:
            print(f"Item {item} not found in list {name}")
            return None
        
        if self.set_variable(name, current, 'array'):
            return current
        
        return None
    
    def set_nested_value(
        self,
        name: str,
        key_path: List[str],
        value: Any
    ) -> bool:
        """
        Set a nested value in an object variable.
        
        Args:
            name: Variable name
            key_path: Path to the nested key
            value: Value to set
            
        Returns:
            True if successful, False otherwise
        """
        current = self.get_value(name, {})
        
        if not isinstance(current, dict):
            print(f"Variable {name} is not an object")
            return False
        
        # Navigate to the nested location
        obj = current
        for key in key_path[:-1]:
            if key not in obj:
                obj[key] = {}
            obj = obj[key]
        
        # Set the value
        obj[key_path[-1]] = value
        
        return self.set_variable(name, current, 'object')
    
    def get_nested_value(
        self,
        name: str,
        key_path: List[str],
        default: Any = None
    ) -> Any:
        """
        Get a nested value from an object variable.
        
        Args:
            name: Variable name
            key_path: Path to the nested key
            default: Default value if not found
            
        Returns:
            Value or default
        """
        current = self.get_value(name, {})
        
        if not isinstance(current, dict):
            return default
        
        obj = current
        for key in key_path:
            if isinstance(obj, dict) and key in obj:
                obj = obj[key]
            else:
                return default
        
        return obj
    
    def exists(self, name: str) -> bool:
        """
        Check if a variable exists.
        
        Args:
            name: Variable name
            
        Returns:
            True if variable exists, False otherwise
        """
        return self.get_variable(name) is not None
    
    def get_all_names(self) -> List[str]:
        """
        Get all variable names.
        
        Returns:
            List of variable names
        """
        variables = self.load_variables()
        if variables is None:
            return []
        
        return list(variables.variables.keys())
    
    def count(self) -> int:
        """
        Get the number of variables.
        
        Returns:
            Number of variables
        """
        variables = self.load_variables()
        if variables is None:
            return 0
        
        return len(variables.variables)
    
    def clear_all(self) -> bool:
        """
        Clear all variables.
        
        Returns:
            True if cleared successfully, False otherwise
        """
        variables = Variables()
        
        if not self.save_variables(variables):
            return False
        
        # Log the clear operation
        self.build_logger.log_variable_change(
            variable_name="<all>",
            old_value="[all variables]",
            new_value="<cleared>",
            triggered_by="variables_manager"
        )
        
        return True

