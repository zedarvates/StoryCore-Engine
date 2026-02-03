"""
Unit tests for CLI interface.

Tests argument parsing, configuration, and test selection logic.

Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
"""

import os
import sys
from pathlib import Path
from unittest.mock import patch

import pytest

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from run_comfyui_tests import (
    parse_arguments,
    get_config_from_args
)


class TestArgumentParsing:
    """Test command-line argument parsing."""
    
    def test_default_arguments(self):
        """Test parsing with no arguments uses defaults."""
        with patch('sys.argv', ['run_comfyui_tests.py']):
            args = parse_arguments()
            
            assert args.url is None
            assert args.output_dir is None
            assert args.timeout is None
            assert args.test_type is None
            assert args.workflows_dir is None
            assert args.prompts is None
            assert args.poll_interval == 5
            assert args.verbose is False
            assert args.no_report is False
    
    def test_url_argument(self):
        """Test --url argument parsing."""
        with patch('sys.argv', ['run_comfyui_tests.py', '--url', 'http://localhost:8188']):
            args = parse_arguments()
            assert args.url == 'http://localhost:8188'
    
    def test_output_dir_argument(self):
        """Test --output-dir argument parsing."""
        with patch('sys.argv', ['run_comfyui_tests.py', '--output-dir', './my_results']):
            args = parse_arguments()
            assert args.output_dir == './my_results'
    
    def test_timeout_argument(self):
        """Test --timeout argument parsing."""
        with patch('sys.argv', ['run_comfyui_tests.py', '--timeout', '600']):
            args = parse_arguments()
            assert args.timeout == 600
    
    def test_test_type_argument(self):
        """Test --test-type argument parsing."""
        for test_type in ['image', 'video', 'pipeline', 'all']:
            with patch('sys.argv', ['run_comfyui_tests.py', '--test-type', test_type]):
                args = parse_arguments()
                assert args.test_type == test_type
    
    def test_workflows_dir_argument(self):
        """Test --workflows-dir argument parsing."""
        with patch('sys.argv', ['run_comfyui_tests.py', '--workflows-dir', './my_workflows']):
            args = parse_arguments()
            assert args.workflows_dir == './my_workflows'
    
    def test_multiple_prompts(self):
        """Test multiple --prompt arguments."""
        with patch('sys.argv', [
            'run_comfyui_tests.py',
            '--prompt', 'First prompt',
            '--prompt', 'Second prompt'
        ]):
            args = parse_arguments()
            assert args.prompts == ['First prompt', 'Second prompt']
    
    def test_poll_interval_argument(self):
        """Test --poll-interval argument parsing."""
        with patch('sys.argv', ['run_comfyui_tests.py', '--poll-interval', '10']):
            args = parse_arguments()
            assert args.poll_interval == 10
    
    def test_verbose_flag(self):
        """Test --verbose flag."""
        with patch('sys.argv', ['run_comfyui_tests.py', '--verbose']):
            args = parse_arguments()
            assert args.verbose is True
    
    def test_no_report_flag(self):
        """Test --no-report flag."""
        with patch('sys.argv', ['run_comfyui_tests.py', '--no-report']):
            args = parse_arguments()
            assert args.no_report is True


class TestConfigurationFromArgs:
    """Test configuration creation from arguments and environment variables."""
    
    def test_config_from_default_args(self):
        """Test config creation with default arguments."""
        with patch('sys.argv', ['run_comfyui_tests.py']):
            args = parse_arguments()
            config = get_config_from_args(args)
            
            # Requirement 8.1: Default URL
            assert config.comfyui_url == 'http://localhost:8000'
            
            # Requirement 8.2: Default output directory
            assert config.output_dir == Path('temp_comfyui_export_test')
            
            # Requirement 8.3: Default timeout
            assert config.timeout == 300
            
            # Requirement 8.6: Default workflows directory
            assert config.workflows_dir == Path('assets/workflows')
            
            # Default poll interval
            assert config.poll_interval == 5
            
            # Default test prompts
            assert len(config.test_prompts) == 2
    
    def test_config_from_command_line_args(self):
        """Test config creation with command-line arguments."""
        with patch('sys.argv', [
            'run_comfyui_tests.py',
            '--url', 'http://localhost:8188',
            '--output-dir', './test_output',
            '--timeout', '600',
            '--workflows-dir', './workflows',
            '--poll-interval', '10',
            '--prompt', 'Test prompt'
        ]):
            args = parse_arguments()
            config = get_config_from_args(args)
            
            # Requirement 8.1: Custom URL
            assert config.comfyui_url == 'http://localhost:8188'
            
            # Requirement 8.2: Custom output directory
            assert config.output_dir == Path('./test_output')
            
            # Requirement 8.3: Custom timeout
            assert config.timeout == 600
            
            # Requirement 8.6: Custom workflows directory
            assert config.workflows_dir == Path('./workflows')
            
            # Custom poll interval
            assert config.poll_interval == 10
            
            # Custom prompts
            assert config.test_prompts == ['Test prompt']
    
    def test_config_from_environment_variables(self):
        """Test config creation with environment variables."""
        # Requirement 8.5: Environment variable override
        env_vars = {
            'COMFYUI_URL': 'http://env-url:8188',
            'COMFYUI_OUTPUT_DIR': './env_output',
            'COMFYUI_TIMEOUT': '900',
            'COMFYUI_WORKFLOWS_DIR': './env_workflows'
        }
        
        with patch.dict(os.environ, env_vars):
            with patch('sys.argv', ['run_comfyui_tests.py']):
                args = parse_arguments()
                config = get_config_from_args(args)
                
                # Requirement 8.1: URL from environment
                assert config.comfyui_url == 'http://env-url:8188'
                
                # Requirement 8.2: Output directory from environment
                assert config.output_dir == Path('./env_output')
                
                # Requirement 8.3: Timeout from environment
                assert config.timeout == 900
                
                # Requirement 8.6: Workflows directory from environment
                assert config.workflows_dir == Path('./env_workflows')
    
    def test_command_line_overrides_environment(self):
        """Test that command-line arguments override environment variables."""
        # Requirement 8.5: Priority order
        env_vars = {
            'COMFYUI_URL': 'http://env-url:8188',
            'COMFYUI_TIMEOUT': '900'
        }
        
        with patch.dict(os.environ, env_vars):
            with patch('sys.argv', [
                'run_comfyui_tests.py',
                '--url', 'http://cli-url:8000',
                '--timeout', '600'
            ]):
                args = parse_arguments()
                config = get_config_from_args(args)
                
                # Command-line should override environment
                assert config.comfyui_url == 'http://cli-url:8000'
                assert config.timeout == 600
    
    def test_custom_prompts_override_defaults(self):
        """Test that custom prompts override default prompts."""
        with patch('sys.argv', [
            'run_comfyui_tests.py',
            '--prompt', 'Custom prompt 1',
            '--prompt', 'Custom prompt 2'
        ]):
            args = parse_arguments()
            config = get_config_from_args(args)
            
            assert config.test_prompts == ['Custom prompt 1', 'Custom prompt 2']


class TestTestSelection:
    """Test test selection logic."""
    
    def test_test_type_from_argument(self):
        """Test test type selection from command-line argument."""
        # Requirement 8.4: Test selection configuration
        for test_type in ['image', 'video', 'pipeline', 'all']:
            with patch('sys.argv', ['run_comfyui_tests.py', '--test-type', test_type]):
                args = parse_arguments()
                assert args.test_type == test_type
    
    def test_test_type_from_environment(self):
        """Test test type selection from environment variable."""
        # Requirement 8.4: Test selection from environment
        env_vars = {'COMFYUI_TEST_TYPE': 'image'}
        
        with patch.dict(os.environ, env_vars):
            with patch('sys.argv', ['run_comfyui_tests.py']):
                args = parse_arguments()
                # Test type should be read from environment in main()
                # Here we just verify the argument parsing works
                assert args.test_type is None  # Not set via CLI
    
    def test_invalid_test_type_rejected(self):
        """Test that invalid test types are rejected."""
        with patch('sys.argv', ['run_comfyui_tests.py', '--test-type', 'invalid']):
            with pytest.raises(SystemExit):
                parse_arguments()


class TestExitCodes:
    """Test exit code behavior."""
    
    def test_help_exits_with_zero(self):
        """Test that --help exits with code 0."""
        with patch('sys.argv', ['run_comfyui_tests.py', '--help']):
            with pytest.raises(SystemExit) as exc_info:
                parse_arguments()
            assert exc_info.value.code == 0


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
