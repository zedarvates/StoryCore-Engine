"""
Credential Manager Module

Securely loads credentials from environment variables and optional configuration files.
Provides clear error messages for missing credentials without exposing values.
Generates configuration templates with placeholders.
"""

import os
import json
from pathlib import Path
from typing import Dict, Optional, Any, List
from dataclasses import dataclass


class CredentialError(Exception):
    """Exception raised when credentials are missing or invalid."""
    pass


@dataclass
class CredentialConfig:
    """Configuration for a credential."""
    name: str
    env_var: str
    required: bool = True
    default: Optional[str] = None
    description: str = ""


class CredentialManager:
    """
    Manages secure loading of credentials from environment variables and config files.
    
    Features:
    - Load credentials from environment variables (primary source)
    - Load credentials from optional JSON config file (fallback)
    - Provide clear error messages for missing credentials
    - Generate configuration templates with placeholders
    - Never expose credential values in error messages
    """
    
    def __init__(self, config_path: Optional[Path] = None):
        """
        Initialize the credential manager.
        
        Args:
            config_path: Optional path to JSON configuration file
        """
        self.config_path = config_path
        self._credentials: Dict[str, str] = {}
        self._config_definitions: List[CredentialConfig] = []
    
    def register_credential(
        self,
        name: str,
        env_var: str,
        required: bool = True,
        default: Optional[str] = None,
        description: str = ""
    ) -> None:
        """
        Register a credential configuration.
        
        Args:
            name: Internal name for the credential
            env_var: Environment variable name
            required: Whether the credential is required
            default: Default value if not provided
            description: Description for documentation
        """
        config = CredentialConfig(
            name=name,
            env_var=env_var,
            required=required,
            default=default,
            description=description
        )
        self._config_definitions.append(config)
    
    def load_credentials(self) -> Dict[str, str]:
        """
        Load all registered credentials from environment or config file.
        
        Returns:
            Dictionary mapping credential names to values
            
        Raises:
            CredentialError: If required credentials are missing
        """
        self._credentials = {}
        missing_credentials = []
        
        # Load from config file if provided
        config_data = {}
        if self.config_path and self.config_path.exists():
            try:
                with open(self.config_path, 'r') as f:
                    config_data = json.load(f)
            except Exception as e:
                raise CredentialError(
                    f"Failed to load credential configuration from {self.config_path}: {e}"
                )
        
        # Load each registered credential
        for config in self._config_definitions:
            value = None
            
            # Try environment variable first (highest priority)
            value = os.environ.get(config.env_var)
            
            # Try config file as fallback
            if value is None and config.name in config_data:
                value = config_data[config.name]
            
            # Use default if provided
            if value is None and config.default is not None:
                value = config.default
            
            # Check if required credential is missing
            if value is None and config.required:
                missing_credentials.append(config)
            elif value is not None:
                self._credentials[config.name] = value
        
        # Raise error if any required credentials are missing
        if missing_credentials:
            self._raise_missing_credentials_error(missing_credentials)
        
        return self._credentials.copy()
    
    def _raise_missing_credentials_error(self, missing: List[CredentialConfig]) -> None:
        """
        Raise a clear error message for missing credentials without exposing values.
        
        Args:
            missing: List of missing credential configurations
        """
        error_lines = [
            "Required credentials are missing. Please provide them via environment variables or config file.",
            "",
            "Missing credentials:"
        ]
        
        for config in missing:
            error_lines.append(f"  - {config.name}")
            error_lines.append(f"    Environment variable: {config.env_var}")
            if config.description:
                error_lines.append(f"    Description: {config.description}")
            error_lines.append("")
        
        if self.config_path:
            error_lines.append(f"Config file location: {self.config_path}")
        else:
            error_lines.append("No config file specified. Set credentials via environment variables.")
        
        error_lines.append("")
        error_lines.append("To generate a template config file, use:")
        error_lines.append("  credential_manager.generate_template('config.json')")
        
        raise CredentialError("\n".join(error_lines))
    
    def get(self, name: str) -> str:
        """
        Get a credential value by name.
        
        Args:
            name: Credential name
            
        Returns:
            Credential value
            
        Raises:
            CredentialError: If credential not found
        """
        if name not in self._credentials:
            raise CredentialError(
                f"Credential '{name}' not found. "
                f"Ensure credentials are loaded with load_credentials() first."
            )
        return self._credentials[name]
    
    def get_optional(self, name: str, default: Optional[str] = None) -> Optional[str]:
        """
        Get an optional credential value by name.
        
        Args:
            name: Credential name
            default: Default value if not found
            
        Returns:
            Credential value or default
        """
        return self._credentials.get(name, default)
    
    def has(self, name: str) -> bool:
        """
        Check if a credential is loaded.
        
        Args:
            name: Credential name
            
        Returns:
            True if credential is loaded
        """
        return name in self._credentials
    
    def generate_template(self, output_path: Path, include_env_example: bool = True) -> None:
        """
        Generate a configuration template file with placeholders.
        
        Args:
            output_path: Path where template should be written
            include_env_example: Whether to include .env example file
        """
        # Generate JSON template
        template = {
            "_comment": "Credential configuration file - DO NOT commit to version control",
            "_instructions": "Replace placeholder values with actual credentials"
        }
        
        for config in self._config_definitions:
            placeholder = f"<{config.name.upper()}_VALUE>"
            if config.description:
                template[f"_{config.name}_description"] = config.description
            template[config.name] = placeholder
        
        # Write JSON template
        with open(output_path, 'w') as f:
            json.dump(template, f, indent=2)
        
        print(f"Generated credential template: {output_path}")
        print(f"⚠️  Remember to add {output_path} to .gitignore")
        
        # Generate .env example if requested
        if include_env_example:
            env_path = output_path.parent / f"{output_path.stem}.env.example"
            env_lines = [
                "# Environment variables for credentials",
                "# Copy this file to .env and fill in actual values",
                "# DO NOT commit .env to version control",
                ""
            ]
            
            for config in self._config_definitions:
                if config.description:
                    env_lines.append(f"# {config.description}")
                placeholder = f"<{config.name.upper()}_VALUE>"
                env_lines.append(f"{config.env_var}={placeholder}")
                env_lines.append("")
            
            with open(env_path, 'w') as f:
                f.write("\n".join(env_lines))
            
            print(f"Generated environment template: {env_path}")
    
    def validate_config_file(self, config_path: Path) -> List[str]:
        """
        Validate a configuration file without loading credentials.
        
        Args:
            config_path: Path to config file to validate
            
        Returns:
            List of validation warnings/errors
        """
        issues = []
        
        if not config_path.exists():
            issues.append(f"Config file does not exist: {config_path}")
            return issues
        
        try:
            with open(config_path, 'r') as f:
                config_data = json.load(f)
        except json.JSONDecodeError as e:
            issues.append(f"Invalid JSON in config file: {e}")
            return issues
        except Exception as e:
            issues.append(f"Failed to read config file: {e}")
            return issues
        
        # Check for placeholder values
        for key, value in config_data.items():
            if key.startswith('_'):
                continue  # Skip metadata fields
            
            if isinstance(value, str) and ('<' in value and '>' in value):
                issues.append(f"Placeholder value detected for '{key}': {value}")
        
        # Check for missing required credentials
        registered_names = {config.name for config in self._config_definitions}
        for config in self._config_definitions:
            if config.required and config.name not in config_data:
                issues.append(f"Required credential missing: {config.name}")
        
        # Check for unknown credentials
        for key in config_data:
            if key.startswith('_'):
                continue
            if key not in registered_names:
                issues.append(f"Unknown credential in config: {key}")
        
        return issues


# Example usage and common credential configurations
def create_default_manager(config_path: Optional[Path] = None) -> CredentialManager:
    """
    Create a credential manager with common credential configurations.
    
    Args:
        config_path: Optional path to config file
        
    Returns:
        Configured CredentialManager instance
    """
    manager = CredentialManager(config_path)
    
    # Common credentials
    manager.register_credential(
        name="api_key",
        env_var="STORYCORE_API_KEY",
        required=False,
        description="API key for external services"
    )
    
    manager.register_credential(
        name="database_url",
        env_var="DATABASE_URL",
        required=False,
        description="Database connection URL"
    )
    
    manager.register_credential(
        name="secret_key",
        env_var="SECRET_KEY",
        required=False,
        description="Application secret key for encryption"
    )
    
    manager.register_credential(
        name="aws_access_key_id",
        env_var="AWS_ACCESS_KEY_ID",
        required=False,
        description="AWS access key ID"
    )
    
    manager.register_credential(
        name="aws_secret_access_key",
        env_var="AWS_SECRET_ACCESS_KEY",
        required=False,
        description="AWS secret access key"
    )
    
    return manager


def main():
    """CLI interface for credential manager."""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python credential_manager.py generate <output_path>  - Generate template")
        print("  python credential_manager.py validate <config_path>  - Validate config")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "generate":
        if len(sys.argv) < 3:
            print("Error: output path required")
            sys.exit(1)
        
        output_path = Path(sys.argv[2])
        manager = create_default_manager()
        manager.generate_template(output_path)
        
    elif command == "validate":
        if len(sys.argv) < 3:
            print("Error: config path required")
            sys.exit(1)
        
        config_path = Path(sys.argv[2])
        manager = create_default_manager(config_path)
        issues = manager.validate_config_file(config_path)
        
        if issues:
            print("Validation issues found:")
            for issue in issues:
                print(f"  - {issue}")
            sys.exit(1)
        else:
            print("Config file is valid")
            sys.exit(0)
    
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()
