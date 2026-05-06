#!/usr/bin/env python3
"""
Automatic OpenAPI/Swagger documentation generator for StoryCore-Engine
Extracts the OpenAPI specification from the FastAPI application and saves it as JSON/YAML
"""

import json
import sys
from pathlib import (
    Path,
)  # Add the backend directory to the path so we can import the app

backend_path = Path(__file__).parent.parent.parent / "backend"
sys.path.insert(0, str(backend_path))


def generate_openapi_spec():
    """Generate OpenAPI specification from the FastAPI app"""
    try:
        from main_api import app

        # Generate OpenAPI specification
        openapi_spec = app.openapi()

        # Save as JSON
        output_dir = Path(__file__).parent
        json_path = output_dir / "openapi.json"
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(openapi_spec, f, indent=2, ensure_ascii=False)

        print(f"OpenAPI specification saved to: {json_path}")
        print(f"Specification contains {len(openapi_spec.get('paths', {}))} endpoints")

        # Also save as YAML if PyYAML is available
        try:
            import yaml

            yaml_path = output_dir / "openapi.yaml"
            with open(yaml_path, "w", encoding="utf-8") as f:
                yaml.dump(openapi_spec, f, default_flow_style=False, allow_unicode=True)
            print(f"OpenAPI specification also saved as YAML: {yaml_path}")
        except ImportError:
            print("PyYAML not installed, skipping YAML generation")

        return openapi_spec
    except Exception as e:
        print(f"Error generating OpenAPI specification: {e}")
        import traceback

        traceback.print_exc()
        return None


if __name__ == "__main__":
    print("Generating OpenAPI specification for StoryCore-Engine...")
    spec = generate_openapi_spec()
    if spec:
        print("\nDocumentation generation complete!")
        print("Generated files:")
        output_dir = Path(__file__).parent
        print(f"  - {output_dir / 'openapi.json'}")
        print(f"  - {output_dir / 'openapi.yaml'} (if PyYAML installed)")
    else:
        print("Failed to generate OpenAPI specification")
        sys.exit(1)
