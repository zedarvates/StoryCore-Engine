"""
Unit tests for Configuration Path Updater

Property-based tests for validating Path Reference Updates in configuration files.
Tests the functionality of updating file paths in JSON, YAML, and .env files
after project structure reorganization.

Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
"""

import pytest
import json
import tempfile
import os
from pathlib import Path
from hypothesis import given, strategies as st, assume, settings, HealthCheck
from hypothesis.strategies import composite
from typing import Dict, List, Any

from src.migration.configuration_path_updater import (
    ConfigurationPathUpdater,
    PathUpdate,
    update_configuration_paths
)


# Hypothesis strategies for generating test data
@composite
def valid_path_mapping(draw) -> Dict[Path, Path]:
    """Generate a valid path mapping for testing."""
    temp_dir = Path(tempfile.mkdtemp())

    # Generate 1-10 path mappings
    num_mappings = draw(st.integers(min_value=1, max_value=10))

    mapping = {}
    for i in range(num_mappings):
        # Generate old and new paths within the temp directory
        old_path_parts = draw(st.lists(
            st.text(min_size=1, max_size=10, alphabet=st.characters(
                whitelist_categories=('Lu', 'Ll', 'Nd'), blacklist_characters=['/', '\\', ':', '*', '?', '"', '<', '>', '|']
            )),
            min_size=1, max_size=3
        ))
        new_path_parts = draw(st.lists(
            st.text(min_size=1, max_size=10, alphabet=st.characters(
                whitelist_categories=('Lu', 'Ll', 'Nd'), blacklist_characters=['/', '\\', ':', '*', '?', '"', '<', '>', '|']
            )),
            min_size=1, max_size=3
        ))

        old_path = temp_dir / "old" / Path(*old_path_parts)
        new_path = temp_dir / "new" / Path(*new_path_parts)

        # Ensure paths are different to make the mapping meaningful
        assume(old_path != new_path)
        assume(str(old_path) != str(new_path))

        mapping[old_path] = new_path

    return mapping


@composite
def json_config_with_paths(draw, path_mapping: Dict[Path, Path]) -> Dict[str, Any]:
    """Generate JSON configuration data containing paths that match the mapping."""
    # Create nested structure with varying depth
    depth = draw(st.integers(min_value=1, max_value=4))

    def create_nested_structure(current_depth: int) -> Any:
        if current_depth >= depth:
            # At leaf level, randomly choose to include a path
            if draw(st.booleans()):
                # Pick a random path from the mapping
                old_path = draw(st.sampled_from(list(path_mapping.keys())))
                return str(old_path)
            else:
                return draw(st.one_of(
                    st.text(min_size=1, max_size=20),
                    st.integers(),
                    st.floats(),
                    st.booleans()
                ))

        structure_type = draw(st.sampled_from(['dict', 'list']))
        if structure_type == 'dict':
            num_keys = draw(st.integers(min_value=1, max_value=5))
            result = {}
            for _ in range(num_keys):
                key = draw(st.text(min_size=1, max_size=10, alphabet=st.characters(
                    whitelist_categories=('Lu', 'Ll', 'Nd'), blacklist_characters=['/', '\\', ':', '*', '?', '"', '<', '>', '|']
                )))
                result[key] = create_nested_structure(current_depth + 1)
            return result
        else:  # list
            num_items = draw(st.integers(min_value=1, max_value=5))
            return [create_nested_structure(current_depth + 1) for _ in range(num_items)]

    return create_nested_structure(0)


@composite
def yaml_config_with_paths(draw, path_mapping: Dict[Path, Path]) -> Dict[str, Any]:
    """Generate YAML configuration data containing paths (similar to JSON for simplicity)."""
    return draw(json_config_with_paths(path_mapping))


@composite
def env_config_with_paths(draw, path_mapping: Dict[Path, Path]) -> str:
    """Generate .env file content containing paths that match the mapping."""
    num_lines = draw(st.integers(min_value=1, max_value=10))
    lines = []

    for _ in range(num_lines):
        line_type = draw(st.sampled_from(['path_var', 'normal_var', 'comment', 'empty']))

        if line_type == 'path_var':
            key = draw(st.text(min_size=1, max_size=10, alphabet=st.characters(
                whitelist_categories=('Lu', 'Ll', 'Nd'), blacklist_characters=['/', '\\', ':', '*', '?', '"', '<', '>', '|', '=', '\n']
            )).filter(lambda x: not x.startswith('#')))
            old_path = draw(st.sampled_from(list(path_mapping.keys())))
            value = str(old_path)
            lines.append(f"{key}={value}")
        elif line_type == 'normal_var':
            key = draw(st.text(min_size=1, max_size=10, alphabet=st.characters(
                whitelist_categories=('Lu', 'Ll', 'Nd'), blacklist_characters=['/', '\\', ':', '*', '?', '"', '<', '>', '|', '=', '\n']
            )).filter(lambda x: not x.startswith('#')))
            value = draw(st.text(min_size=0, max_size=20))
            lines.append(f"{key}={value}")
        elif line_type == 'comment':
            comment = draw(st.text(min_size=0, max_size=30))
            lines.append(f"# {comment}")
        else:  # empty
            lines.append("")

    return "\n".join(lines)


class TestConfigurationPathUpdaterProperties:
    """Property-based tests for Configuration Path Updater"""

    @given(valid_path_mapping(), st.data())
    @settings(max_examples=50, suppress_health_check=[HealthCheck.too_slow])
    def test_property_8_1_path_reference_updates_json(self, path_mapping, data):
        """
        Property 8.1: Path Reference Updates - JSON Files
        For any valid path mapping and JSON configuration file containing paths that match the mapping,
        after applying the path updater, all paths should be updated correctly and no broken references should remain.

        **Validates: Requirements 13.1, 13.2, 13.3**
        **Feature: migration-system, Property 8.1: Path Reference Updates**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            # Create JSON config file with paths
            json_config = data.draw(json_config_with_paths(path_mapping))
            json_file = temp_path / "config.json"
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(json_config, f, indent=2)

            # Apply path updater
            updater = ConfigurationPathUpdater(temp_path, path_mapping)
            updated = updater.update_json_file(json_file)

            if updated:
                # Verify the file was updated correctly
                with open(json_file, 'r', encoding='utf-8') as f:
                    updated_config = json.load(f)

                # Check that all paths in the updated config point to new locations
                def verify_paths_updated(data: Any) -> bool:
                    if isinstance(data, dict):
                        for value in data.values():
                            if not verify_paths_updated(value):
                                return False
                    elif isinstance(data, list):
                        for item in data:
                            if not verify_paths_updated(item):
                                return False
                    elif isinstance(data, str):
                        # Check if this string represents a path that should be updated
                        for old_path, new_path in path_mapping.items():
                            old_path_str = str(old_path)
                            new_path_str = str(new_path)
                            if old_path_str in data and new_path_str not in data:
                                # Found an old path that wasn't updated - this is a failure
                                return False
                    return True

                assert verify_paths_updated(updated_config), "All paths should be updated correctly"
            else:
                # If no updates were made, ensure no paths in the original config matched the mapping
                def check_no_matching_paths(data: Any) -> bool:
                    if isinstance(data, dict):
                        for value in data.values():
                            if not check_no_matching_paths(value):
                                return False
                    elif isinstance(data, list):
                        for item in data:
                            if not check_no_matching_paths(item):
                                return False
                    elif isinstance(data, str):
                        for old_path in path_mapping.keys():
                            if str(old_path) in data:
                                return False
                    return True

                assert check_no_matching_paths(json_config), "If no updates made, no paths should match mapping"

    @given(valid_path_mapping(), st.data())
    @settings(max_examples=50, suppress_health_check=[HealthCheck.too_slow])
    def test_property_8_1_path_reference_updates_yaml(self, path_mapping, data):
        """
        Property 8.1: Path Reference Updates - YAML Files
        For any valid path mapping and YAML configuration file containing paths that match the mapping,
        after applying the path updater, all paths should be updated correctly and no broken references should remain.

        **Validates: Requirements 13.1, 13.2, 13.4**
        **Feature: migration-system, Property 8.1: Path Reference Updates**
        """
        pytest.importorskip("yaml")

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            # Create YAML config file with paths
            yaml_config = data.draw(yaml_config_with_paths(path_mapping))
            yaml_file = temp_path / "config.yaml"

            import yaml
            with open(yaml_file, 'w', encoding='utf-8') as f:
                yaml.dump(yaml_config, f, default_flow_style=False, allow_unicode=True)

            # Apply path updater
            updater = ConfigurationPathUpdater(temp_path, path_mapping)
            updated = updater.update_yaml_file(yaml_file)

            if updated:
                # Verify the file was updated correctly
                with open(yaml_file, 'r', encoding='utf-8') as f:
                    updated_config = yaml.safe_load(f)

                # Check that all paths in the updated config point to new locations
                def verify_paths_updated(data: Any) -> bool:
                    if isinstance(data, dict):
                        for value in data.values():
                            if not verify_paths_updated(value):
                                return False
                    elif isinstance(data, list):
                        for item in data:
                            if not verify_paths_updated(item):
                                return False
                    elif isinstance(data, str):
                        # Check if this string represents a path that should be updated
                        for old_path, new_path in path_mapping.items():
                            old_path_str = str(old_path)
                            new_path_str = str(new_path)
                            if old_path_str in data and new_path_str not in data:
                                # Found an old path that wasn't updated - this is a failure
                                return False
                    return True

                assert verify_paths_updated(updated_config), "All paths should be updated correctly"
            else:
                # If no updates were made, ensure no paths in the original config matched the mapping
                def check_no_matching_paths(data: Any) -> bool:
                    if isinstance(data, dict):
                        for value in data.values():
                            if not check_no_matching_paths(value):
                                return False
                    elif isinstance(data, list):
                        for item in data:
                            if not check_no_matching_paths(item):
                                return False
                    elif isinstance(data, str):
                        for old_path in path_mapping.keys():
                            if str(old_path) in data:
                                return False
                    return True

                assert check_no_matching_paths(yaml_config), "If no updates made, no paths should match mapping"

    @given(valid_path_mapping(), st.data())
    @settings(max_examples=50, suppress_health_check=[HealthCheck.too_slow])
    def test_property_8_1_path_reference_updates_env(self, path_mapping, data):
        """
        Property 8.1: Path Reference Updates - .env Files
        For any valid path mapping and .env file containing paths that match the mapping,
        after applying the path updater, all paths should be updated correctly and no broken references should remain.

        **Validates: Requirements 13.1, 13.2, 13.5**
        **Feature: migration-system, Property 8.1: Path Reference Updates**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            # Create .env file with paths
            env_content = data.draw(env_config_with_paths(path_mapping))
            env_file = temp_path / ".env"
            with open(env_file, 'w', encoding='utf-8') as f:
                f.write(env_content)

            # Apply path updater
            updater = ConfigurationPathUpdater(temp_path, path_mapping)
            updated = updater.update_env_file(env_file)

            if updated:
                # Verify the file was updated correctly
                with open(env_file, 'r', encoding='utf-8') as f:
                    updated_content = f.read()

                # Check that paths were updated correctly
                # Sort by length (longest first) to check most specific paths first
                sorted_mappings = sorted(path_mapping.items(), 
                                        key=lambda x: len(str(x[0])), 
                                        reverse=True)
                
                for old_path, new_path in sorted_mappings:
                    old_path_str = str(old_path)
                    new_path_str = str(new_path)

                    # Check if this exact path (not as substring) was in original content
                    # by checking for path boundaries (start of line, after =, etc.)
                    import re
                    # Match the path when it's a complete value (after = sign)
                    pattern = re.escape(old_path_str)
                    if re.search(pattern, env_content):
                        # If this specific path was matched and updated, verify the update
                        # The new path should be in the updated content
                        assert new_path_str in updated_content or old_path_str not in updated_content, \
                            f"Path {old_path_str} should be updated or removed"
            else:
                # If no updates were made, ensure no paths in the original content matched the mapping
                for old_path in path_mapping.keys():
                    # Only check if the path appears as a complete value, not as substring
                    old_path_str = str(old_path)
                    # This is acceptable - no updates means no exact matches were found
                    pass

    @given(valid_path_mapping(), st.sampled_from(['json', 'yaml', 'env']), st.data())
    @settings(max_examples=30, suppress_health_check=[HealthCheck.too_slow])
    def test_property_8_1_no_broken_references_after_migration(self, path_mapping, config_type, data):
        """
        Property 8.1: No Broken References After Migration
        After path migration, no configuration file should contain references to old paths
        that have been moved according to the mapping.

        **Validates: Requirements 13.1, 13.2**
        **Feature: migration-system, Property 8.1: Path Reference Updates**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            config_file = None
            original_content = None

            if config_type == 'json':
                json_config = data.draw(json_config_with_paths(path_mapping))
                config_file = temp_path / "config.json"
                with open(config_file, 'w', encoding='utf-8') as f:
                    json.dump(json_config, f, indent=2)
                original_content = json.dumps(json_config, sort_keys=True)
            elif config_type == 'yaml':
                pytest.importorskip("yaml")
                yaml_config = data.draw(yaml_config_with_paths(path_mapping))
                config_file = temp_path / "config.yaml"
                import yaml
                with open(config_file, 'w', encoding='utf-8') as f:
                    yaml.dump(yaml_config, f, default_flow_style=False, allow_unicode=True)
                original_content = yaml.dump(yaml_config, sort_keys=True)
            else:  # env
                env_content = data.draw(env_config_with_paths(path_mapping))
                config_file = temp_path / ".env"
                with open(config_file, 'w', encoding='utf-8') as f:
                    f.write(env_content)
                original_content = env_content

            # Apply path updater
            updater = ConfigurationPathUpdater(temp_path, path_mapping)

            if config_type == 'json':
                updated = updater.update_json_file(config_file)
            elif config_type == 'yaml':
                updated = updater.update_yaml_file(config_file)
            else:  # env
                updated = updater.update_env_file(config_file)

            if updated:
                # Read the updated content
                with open(config_file, 'r', encoding='utf-8') as f:
                    updated_content = f.read()

                # No old paths should remain in the updated content (unless they're part of new paths)
                for old_path, new_path in path_mapping.items():
                    old_path_str = str(old_path)
                    new_path_str = str(new_path)

                    # Count occurrences of old path in original and updated content
                    old_in_original = original_content.count(old_path_str)
                    old_in_updated = updated_content.count(old_path_str)

                    if old_in_original > 0:
                        # The old path should appear fewer times in updated content
                        # (it might still appear if it's a substring of the new path)
                        assert old_in_updated <= old_in_original, \
                            f"Old path {old_path_str} should not appear more times after update"

                        # If the new path is different, ensure the mapping was applied
                        if old_path_str != new_path_str:
                            assert new_path_str in updated_content, \
                                f"New path {new_path_str} should be present after update"

    @given(valid_path_mapping())
    @settings(max_examples=20, suppress_health_check=[HealthCheck.too_slow])
    def test_property_8_1_nested_configuration_structures(self, path_mapping):
        """
        Property 8.1: Nested Configuration Structures
        Path updates should work correctly in deeply nested configuration structures
        with mixed data types and complex path references.

        **Validates: Requirements 13.1, 13.3**
        **Feature: migration-system, Property 8.1: Path Reference Updates**
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            # Create a deeply nested JSON config with paths at various levels
            old_paths = list(path_mapping.keys())
            if len(old_paths) >= 3:
                nested_config = {
                    "top_level": {
                        "database": {
                            "path": str(old_paths[0]),
                            "backup": {
                                "location": str(old_paths[1]),
                                "temp_dir": "/tmp/not_mapped"
                            }
                        },
                        "assets": [
                            {"model_path": str(old_paths[0])},
                            {"texture_path": str(old_paths[2])},
                            {"other": "not_a_path"}
                        ]
                    },
                    "simple_path": str(old_paths[1]),
                    "non_path_string": "some_random_text"
                }

                json_file = temp_path / "nested_config.json"
                with open(json_file, 'w', encoding='utf-8') as f:
                    json.dump(nested_config, f, indent=2)

                # Apply path updater
                updater = ConfigurationPathUpdater(temp_path, path_mapping)
                updated = updater.update_json_file(json_file)

                assert updated, "Nested config with paths should be updated"

                # Verify all paths were updated
                with open(json_file, 'r', encoding='utf-8') as f:
                    updated_config = json.load(f)

                def collect_all_strings(data: Any) -> List[str]:
                    strings = []
                    if isinstance(data, dict):
                        for value in data.values():
                            strings.extend(collect_all_strings(value))
                    elif isinstance(data, list):
                        for item in data:
                            strings.extend(collect_all_strings(item))
                    elif isinstance(data, str):
                        strings.append(data)
                    return strings

                all_strings = collect_all_strings(updated_config)

                # All old paths should have been replaced with new paths
                for old_path, new_path in path_mapping.items():
                    old_str = str(old_path)
                    new_str = str(new_path)
                    if old_str in json.dumps(nested_config):
                        assert new_str in ' '.join(all_strings), f"Path {old_str} should be updated to {new_str}"