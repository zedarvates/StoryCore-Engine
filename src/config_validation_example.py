#!/usr/bin/env python3
"""
Configuration Validation Example
Shows how to validate application configuration files using JSON schema
"""

import json
from jsonschema import validate, ValidationError
from pathlib import Path

# Application configuration schema
CONFIG_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
        "app": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "minLength": 1},
                "version": {"type": "string", "pattern": r"^\d+\.\d+\.\d+$"},
                "debug": {"type": "boolean"}
            },
            "required": ["name", "version"]
        },
        "database": {
            "type": "object",
            "properties": {
                "host": {"type": "string"},
                "port": {"type": "integer", "minimum": 1, "maximum": 65535},
                "name": {"type": "string"},
                "ssl": {"type": "boolean"}
            },
            "required": ["host", "port", "name"]
        },
        "logging": {
            "type": "object",
            "properties": {
                "level": {"enum": ["DEBUG", "INFO", "WARNING", "ERROR"]},
                "file": {"type": "string"},
                "max_size": {"type": "integer", "minimum": 1}
            },
            "required": ["level"]
        }
    },
    "required": ["app", "database"]
}

def validate_config(config_path):
    """Validate configuration file against schema"""
    try:
        with open(config_path, 'r') as f:
            config = json.load(f)
        
        validate(config, CONFIG_SCHEMA)
        print(f"✓ Configuration {config_path} is valid")
        return True, config
        
    except FileNotFoundError:
        print(f"✗ Configuration file {config_path} not found")
        return False, None
    except json.JSONDecodeError as e:
        print(f"✗ Invalid JSON in {config_path}: {e}")
        return False, None
    except ValidationError as e:
        print(f"✗ Configuration validation failed: {e.message}")
        print(f"  Path: {' -> '.join(str(p) for p in e.absolute_path)}")
        return False, None

# Create sample configuration files
def create_sample_configs():
    # Valid configuration
    valid_config = {
        "app": {
            "name": "MyApplication",
            "version": "1.0.0",
            "debug": False
        },
        "database": {
            "host": "localhost",
            "port": 5432,
            "name": "myapp_db",
            "ssl": True
        },
        "logging": {
            "level": "INFO",
            "file": "/var/log/myapp.log",
            "max_size": 10485760
        }
    }
    
    # Invalid configuration (missing required fields)
    invalid_config = {
        "app": {
            "name": "MyApplication"
            # Missing version
        },
        "database": {
            "host": "localhost",
            "port": "invalid_port",  # Should be integer
            "name": "myapp_db"
        }
    }
    
    with open('config_valid.json', 'w') as f:
        json.dump(valid_config, f, indent=2)
    
    with open('config_invalid.json', 'w') as f:
        json.dump(invalid_config, f, indent=2)

if __name__ == "__main__":
    # Create sample files
    create_sample_configs()
    
    print("=== Configuration Validation Example ===")
    
    # Test valid configuration
    validate_config('config_valid.json')
    
    # Test invalid configuration
    validate_config('config_invalid.json')
    
    # Test non-existent file
    validate_config('nonexistent.json')