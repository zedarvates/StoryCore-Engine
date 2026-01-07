# JSON Schema Validation in Python

## Overview

JSON schema validation ensures data integrity by validating JSON data against predefined schemas. Python offers several powerful libraries for this purpose.

## 1. jsonschema Library

The `jsonschema` library is the reference implementation for JSON Schema validation in Python.

### Installation
```bash
pip install jsonschema
```

### Basic Usage
```python
from jsonschema import validate, ValidationError
import json

# Define schema
schema = {
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "age": {"type": "number", "minimum": 0},
        "email": {"type": "string", "format": "email"}
    },
    "required": ["name", "age"]
}

# Valid data
data = {"name": "John", "age": 30, "email": "john@example.com"}

try:
    validate(instance=data, schema=schema)
    print("Valid!")
except ValidationError as e:
    print(f"Validation error: {e.message}")
```

### Advanced Schema Patterns
```python
# Nested objects and arrays
complex_schema = {
    "type": "object",
    "properties": {
        "user": {
            "type": "object",
            "properties": {
                "id": {"type": "integer"},
                "profile": {
                    "type": "object",
                    "properties": {
                        "skills": {
                            "type": "array",
                            "items": {"type": "string"}
                        }
                    }
                }
            }
        }
    }
}

# Conditional validation
conditional_schema = {
    "type": "object",
    "properties": {
        "type": {"enum": ["user", "admin"]},
        "permissions": {"type": "array"}
    },
    "if": {"properties": {"type": {"const": "admin"}}},
    "then": {"required": ["permissions"]}
}
```

## 2. Pydantic

Pydantic provides data validation using Python type annotations.

### Installation
```bash
pip install pydantic
```

### Basic Model Definition
```python
from pydantic import BaseModel, EmailStr, validator
from typing import List, Optional

class User(BaseModel):
    name: str
    age: int
    email: EmailStr
    skills: List[str] = []
    is_active: bool = True
    
    @validator('age')
    def validate_age(cls, v):
        if v < 0:
            raise ValueError('Age must be non-negative')
        return v

# Usage
try:
    user = User(
        name="John",
        age=30,
        email="john@example.com",
        skills=["Python", "AWS"]
    )
    print(user.json())
except ValidationError as e:
    print(e.json())
```

### Advanced Pydantic Patterns
```python
from pydantic import BaseModel, Field, root_validator
from enum import Enum

class UserType(str, Enum):
    REGULAR = "regular"
    ADMIN = "admin"

class Address(BaseModel):
    street: str
    city: str
    country: str = "US"

class User(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    age: int = Field(..., ge=0, le=150)
    user_type: UserType
    address: Optional[Address] = None
    
    @root_validator
    def validate_admin_requirements(cls, values):
        if values.get('user_type') == UserType.ADMIN and not values.get('address'):
            raise ValueError('Admin users must have an address')
        return values

# JSON Schema generation
print(User.schema_json(indent=2))
```

## 3. Cerberus

Lightweight validation library with simple syntax.

### Installation
```bash
pip install cerberus
```

### Usage
```python
from cerberus import Validator

schema = {
    'name': {'type': 'string', 'required': True},
    'age': {'type': 'integer', 'min': 0, 'max': 150},
    'skills': {
        'type': 'list',
        'schema': {'type': 'string'}
    }
}

v = Validator(schema)
document = {'name': 'John', 'age': 30, 'skills': ['Python', 'AWS']}

if v.validate(document):
    print("Valid!")
else:
    print(v.errors)
```

## 4. Marshmallow

Serialization and validation library.

### Installation
```bash
pip install marshmallow
```

### Usage
```python
from marshmallow import Schema, fields, validate, ValidationError

class UserSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=1))
    age = fields.Int(required=True, validate=validate.Range(min=0))
    email = fields.Email(required=True)
    skills = fields.List(fields.Str())

schema = UserSchema()

try:
    result = schema.load({
        'name': 'John',
        'age': 30,
        'email': 'john@example.com',
        'skills': ['Python']
    })
    print(result)
except ValidationError as err:
    print(err.messages)
```

## Comparison and Use Cases

| Library | Best For | Pros | Cons |
|---------|----------|------|------|
| jsonschema | Standard JSON Schema compliance | Industry standard, comprehensive | Verbose syntax |
| Pydantic | Type-safe Python applications | Type hints, fast, great IDE support | Python-specific |
| Cerberus | Simple validation needs | Lightweight, easy syntax | Limited features |
| Marshmallow | API serialization/deserialization | Flexible, good for APIs | More complex setup |

## Best Practices

1. **Choose the right tool**: Use jsonschema for standard compliance, Pydantic for type safety
2. **Define clear schemas**: Make validation rules explicit and well-documented
3. **Handle errors gracefully**: Provide meaningful error messages to users
4. **Validate early**: Validate data at system boundaries (API endpoints, file inputs)
5. **Use custom validators**: Implement business logic validation when needed

## Performance Considerations

```python
# Pre-compile schemas for better performance
from jsonschema import Draft7Validator

schema = {...}
validator = Draft7Validator(schema)

# Reuse validator instance
for data in data_list:
    errors = list(validator.iter_errors(data))
    if errors:
        print(f"Validation errors: {errors}")
```

## Integration Examples

### Flask API Validation
```python
from flask import Flask, request, jsonify
from jsonschema import validate, ValidationError

app = Flask(__name__)

user_schema = {
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "email": {"type": "string", "format": "email"}
    },
    "required": ["name", "email"]
}

@app.route('/users', methods=['POST'])
def create_user():
    try:
        validate(request.json, user_schema)
        # Process valid data
        return jsonify({"status": "success"})
    except ValidationError as e:
        return jsonify({"error": e.message}), 400
```

### File Validation
```python
import json
from jsonschema import validate

def validate_config_file(file_path, schema):
    with open(file_path, 'r') as f:
        data = json.load(f)
    
    try:
        validate(data, schema)
        return True, None
    except ValidationError as e:
        return False, e.message
```