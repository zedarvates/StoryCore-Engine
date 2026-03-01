#!/usr/bin/env python3
"""
JSON Schema Validation Examples
Demonstrates common patterns and use cases for validating JSON data in Python
"""

from jsonschema import validate, ValidationError, Draft7Validator
from pydantic import BaseModel, ValidationError as PydanticValidationError, Field
from typing import List, Optional, Union
import json

# Example 1: Basic jsonschema validation
def basic_jsonschema_example():
    schema = {
        "type": "object",
        "properties": {
            "name": {"type": "string"},
            "age": {"type": "integer", "minimum": 0}
        },
        "required": ["name"]
    }
    
    valid_data = {"name": "Alice", "age": 25}
    invalid_data = {"age": -5}
    
    try:
        validate(valid_data, schema)
        print("✓ Valid data passed")
    except ValidationError as e:
        print(f"✗ Validation failed: {e.message}")
    
    try:
        validate(invalid_data, schema)
    except ValidationError as e:
        print(f"✗ Invalid data caught: {e.message}")

# Example 2: Pydantic model validation
class User(BaseModel):
    name: str = Field(..., min_length=1)
    age: int = Field(..., ge=0)
    email: Optional[str] = None
    tags: List[str] = []

def pydantic_example():
    try:
        user = User(name="Bob", age=30, tags=["developer"])
        print(f"✓ User created: {user.json()}")
    except PydanticValidationError as e:
        print(f"✗ Pydantic validation failed: {e}")

# Example 3: Complex nested schema
def complex_schema_example():
    schema = {
        "type": "object",
        "properties": {
            "project": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "contributors": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "role": {"enum": ["developer", "designer", "manager"]}
                            },
                            "required": ["name", "role"]
                        }
                    }
                },
                "required": ["name"]
            }
        }
    }
    
    data = {
        "project": {
            "name": "MyApp",
            "contributors": [
                {"name": "Alice", "role": "developer"},
                {"name": "Bob", "role": "designer"}
            ]
        }
    }
    
    try:
        validate(data, schema)
        print("✓ Complex nested data validated")
    except ValidationError as e:
        print(f"✗ Complex validation failed: {e.message}")

# Example 4: Performance-optimized validation
def performance_example():
    schema = {
        "type": "object",
        "properties": {
            "id": {"type": "integer"},
            "value": {"type": "string"}
        }
    }
    
    # Pre-compile validator for better performance
    validator = Draft7Validator(schema)
    
    test_data = [
        {"id": 1, "value": "test1"},
        {"id": 2, "value": "test2"},
        {"id": "invalid", "value": "test3"}  # This will fail
    ]
    
    for i, data in enumerate(test_data):
        errors = list(validator.iter_errors(data))
        if errors:
            print(f"✗ Item {i} failed: {errors[0].message}")
        else:
            print(f"✓ Item {i} valid")

if __name__ == "__main__":
    print("=== Basic jsonschema Example ===")
    basic_jsonschema_example()
    
    print("\n=== Pydantic Example ===")
    pydantic_example()
    
    print("\n=== Complex Schema Example ===")
    complex_schema_example()
    
    print("\n=== Performance Example ===")
    performance_example()