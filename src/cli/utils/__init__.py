"""
CLI Utilities
Shared utility functions and classes used across multiple handlers.
"""

from .project import (
    load_project_config, 
    validate_project_structure, 
    get_project_metadata, 
    ensure_project_directories,
    save_project_config,
    update_project_config,
    get_project_status,
    validate_project_config_schema,
    check_project_exists,
    list_project_files
)
from .validation import (
    validate_path_exists, 
    validate_file_extension, 
    validate_positive_int, 
    validate_choice,
    validate_project_name,
    validate_grid_format,
    validate_scale_factor,
    validate_quality_level,
    validate_url,
    validate_port,
    validate_range,
    validate_float_range,
    validate_directory_exists,
    validate_file_exists,
    validate_writable_path,
    validate_json_string,
    validate_regex_pattern,
    validate_non_empty_string,
    validate_email,
    validate_duration,
    validate_percentage
)
from .output import (
    print_success, 
    print_error, 
    print_warning, 
    print_info,
    print_progress,
    format_duration, 
    format_file_size,
    format_table,
    print_table,
    truncate_text
)
from .config import (
    load_config, 
    save_config, 
    get_config_path,
    get_merged_config,
    validate_config,
    get_active_profile,
    load_profile_config,
    save_profile_config,
    list_profiles,
    get_environment_overrides,
    inspect_config,
    create_default_config,
    initialize_config
)
from .progress import (
    ProgressIndicator,
    ProgressBar,
    show_progress,
    format_duration as format_duration_progress,
    format_size
)

__all__ = [
    # Project utilities
    'load_project_config',
    'validate_project_structure', 
    'get_project_metadata',
    'ensure_project_directories',
    'save_project_config',
    'update_project_config',
    'get_project_status',
    'validate_project_config_schema',
    'check_project_exists',
    'list_project_files',
    
    # Validation utilities
    'validate_path_exists',
    'validate_file_extension',
    'validate_positive_int',
    'validate_choice',
    'validate_project_name',
    'validate_grid_format',
    'validate_scale_factor',
    'validate_quality_level',
    'validate_url',
    'validate_port',
    'validate_range',
    'validate_float_range',
    'validate_directory_exists',
    'validate_file_exists',
    'validate_writable_path',
    'validate_json_string',
    'validate_regex_pattern',
    'validate_non_empty_string',
    'validate_email',
    'validate_duration',
    'validate_percentage',
    
    # Output utilities
    'print_success',
    'print_error',
    'print_warning',
    'print_info',
    'print_progress',
    'format_duration',
    'format_file_size',
    'format_table',
    'print_table',
    'truncate_text',
    
    # Configuration utilities
    'load_config',
    'save_config',
    'get_config_path',
    'get_merged_config',
    'validate_config',
    'get_active_profile',
    'load_profile_config',
    'save_profile_config',
    'list_profiles',
    'get_environment_overrides',
    'inspect_config',
    'create_default_config',
    'initialize_config',
    
    # Progress utilities
    'ProgressIndicator',
    'ProgressBar',
    'show_progress',
    'format_duration_progress',
    'format_size'
]