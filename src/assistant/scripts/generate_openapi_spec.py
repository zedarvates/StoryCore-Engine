#!/usr/bin/env python3
"""
Generate OpenAPI specification file from FastAPI app.

This script exports the OpenAPI schema to a JSON file that can be used
for API documentation, client generation, and testing tools.
"""

import json
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from src.assistant.api.app import app


def generate_openapi_spec(output_path: str = "openapi.json"):
    """
    Generate OpenAPI specification file.
    
    Args:
        output_path: Path where the OpenAPI spec will be saved
    """
    # Get OpenAPI schema from FastAPI app
    openapi_schema = app.openapi()
    
    # Write to file
    output_file = Path(__file__).parent.parent / "docs" / output_path
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(openapi_schema, f, indent=2, ensure_ascii=False)
    
    print(f"✓ OpenAPI specification generated: {output_file}")
    print(f"  Title: {openapi_schema['info']['title']}")
    print(f"  Version: {openapi_schema['info']['version']}")
    print(f"  Endpoints: {len(openapi_schema['paths'])}")
    print(f"  Schemas: {len(openapi_schema['components']['schemas'])}")
    
    return output_file


if __name__ == "__main__":
    output_path = sys.argv[1] if len(sys.argv) > 1 else "openapi.json"
    generate_openapi_spec(output_path)
