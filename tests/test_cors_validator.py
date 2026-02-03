"""
Unit tests for CORS Validator.

Tests CORS validation functionality and instruction generation.
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from aiohttp import ClientError, ClientResponse
from src.end_to_end.cors_validator import CORSValidator, CORSValidationResult
from src.end_to_end.connection_manager import ConnectionManager, ComfyUIConfig


@pytest.fixture
def mock_connection_manager():
    """Create mock connection manager"""
    config = ComfyUIConfig(host="localhost", port=8000)
    manager = Mock(spec=ConnectionManager)
    manager.config = config
    manager._session = None
    return manager


@pytest.fixture
def cors_validator(mock_connection_manager):
    """Create CORS validator instance"""
    return CORSValidator(mock_connection_manager)


class TestCORSValidatorInit:
    """Test CORSValidator initialization"""
    
    def test_init_with_connection_manager(self, mock_connection_manager):
        """Test initialization with connection manager"""
        validator = CORSValidator(mock_connection_manager)
        
        assert validator.connection_manager == mock_connection_manager
        assert hasattr(validator, 'REQUIRED_HEADERS')
        assert len(validator.REQUIRED_HEADERS) == 3
    
    def test_required_headers_defined(self, cors_validator):
        """Test required CORS headers are properly defined"""
        required = cors_validator.REQUIRED_HEADERS
        
        assert 'access-control-allow-origin' in required
        assert 'access-control-allow-methods' in required
        assert 'access-control-allow-headers' in required


class TestValidateCORS:
    """Test CORS validation functionality"""
    
    @pytest.mark.asyncio
    async def test_validate_cors_success_all_headers_present(self, cors_validator, mock_connection_manager):
        """Test successful CORS validation with all headers present"""
        # Mock session and response
        mock_session = MagicMock()
        mock_response = MagicMock()
        mock_response.headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
        
        # Setup async context manager
        mock_context = AsyncMock()
        mock_context.__aenter__.return_value = mock_response
        mock_session.options.return_value = mock_context
        mock_session.closed = False
        mock_connection_manager._session = mock_session
        
        # Validate CORS
        result = await cors_validator.validate_cors()
        
        # Assertions
        assert isinstance(result, CORSValidationResult)
        assert result.valid is True
        assert len(result.headers_present) == 3
        assert len(result.headers_missing) == 0
        assert result.error_message is None
        assert result.instructions == ""
    
    @pytest.mark.asyncio
    async def test_validate_cors_missing_headers(self, cors_validator, mock_connection_manager):
        """Test CORS validation with missing headers"""
        # Mock session and response with only one header
        mock_session = MagicMock()
        mock_response = MagicMock()
        mock_response.headers = {
            'Access-Control-Allow-Origin': '*'
        }
        
        # Setup async context manager
        mock_context = AsyncMock()
        mock_context.__aenter__.return_value = mock_response
        mock_session.options.return_value = mock_context
        mock_session.closed = False
        mock_connection_manager._session = mock_session
        
        # Validate CORS
        result = await cors_validator.validate_cors()
        
        # Assertions
        assert result.valid is False
        assert len(result.headers_present) == 1
        assert len(result.headers_missing) == 2
        assert 'Access-Control-Allow-Methods' in result.headers_missing
        assert 'Access-Control-Allow-Headers' in result.headers_missing
        assert result.error_message is not None
        assert 'Missing required CORS headers' in result.error_message
        assert len(result.instructions) > 0
    
    @pytest.mark.asyncio
    async def test_validate_cors_no_headers(self, cors_validator, mock_connection_manager):
        """Test CORS validation with no CORS headers"""
        # Mock session and response with no CORS headers
        mock_session = MagicMock()
        mock_response = MagicMock()
        mock_response.headers = {}
        
        # Setup async context manager
        mock_context = AsyncMock()
        mock_context.__aenter__.return_value = mock_response
        mock_session.options.return_value = mock_context
        mock_session.closed = False
        mock_connection_manager._session = mock_session
        
        # Validate CORS
        result = await cors_validator.validate_cors()
        
        # Assertions
        assert result.valid is False
        assert len(result.headers_present) == 0
        assert len(result.headers_missing) == 3
        assert result.error_message is not None
        assert len(result.instructions) > 0
    
    @pytest.mark.asyncio
    async def test_validate_cors_custom_origin(self, cors_validator, mock_connection_manager):
        """Test CORS validation with custom origin"""
        # Mock session and response
        mock_session = MagicMock()
        mock_response = MagicMock()
        mock_response.headers = {
            'Access-Control-Allow-Origin': 'http://custom-origin.com',
            'Access-Control-Allow-Methods': 'GET, POST',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
        
        # Setup async context manager
        mock_context = AsyncMock()
        mock_context.__aenter__.return_value = mock_response
        mock_session.options.return_value = mock_context
        mock_session.closed = False
        mock_connection_manager._session = mock_session
        
        # Validate CORS with custom origin
        result = await cors_validator.validate_cors(origin="http://custom-origin.com")
        
        # Assertions
        assert result.valid is True
        
        # Verify OPTIONS request was made with correct origin
        mock_session.options.assert_called_once()
        call_args = mock_session.options.call_args
        assert call_args[1]['headers']['Origin'] == "http://custom-origin.com"
    
    @pytest.mark.asyncio
    async def test_validate_cors_connection_error(self, cors_validator, mock_connection_manager):
        """Test CORS validation handles connection errors"""
        # Mock session that raises ClientError
        mock_session = MagicMock()
        mock_session.options.side_effect = ClientError("Connection failed")
        mock_session.closed = False
        mock_connection_manager._session = mock_session
        
        # Validate CORS
        result = await cors_validator.validate_cors()
        
        # Assertions
        assert result.valid is False
        assert len(result.headers_present) == 0
        assert len(result.headers_missing) == 3
        assert result.error_message is not None
        assert 'Failed to validate CORS' in result.error_message
        assert len(result.instructions) > 0
    
    @pytest.mark.asyncio
    async def test_validate_cors_unexpected_error(self, cors_validator, mock_connection_manager):
        """Test CORS validation handles unexpected errors"""
        # Mock session that raises unexpected error
        mock_session = MagicMock()
        mock_session.options.side_effect = Exception("Unexpected error")
        mock_session.closed = False
        mock_connection_manager._session = mock_session
        
        # Validate CORS
        result = await cors_validator.validate_cors()
        
        # Assertions
        assert result.valid is False
        assert result.error_message is not None
        assert 'Unexpected error' in result.error_message
        assert len(result.instructions) > 0
    
    @pytest.mark.asyncio
    async def test_validate_cors_creates_session_if_needed(self, cors_validator, mock_connection_manager):
        """Test CORS validation creates session if not present"""
        # No session initially
        mock_connection_manager._session = None
        
        # Mock session creation
        mock_session = MagicMock()
        mock_response = MagicMock()
        mock_response.headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
        
        # Setup async context manager
        mock_context = AsyncMock()
        mock_context.__aenter__.return_value = mock_response
        mock_session.options.return_value = mock_context
        
        with patch('aiohttp.ClientSession', return_value=mock_session):
            # Validate CORS
            result = await cors_validator.validate_cors()
            
            # Session should be created
            assert mock_connection_manager._session == mock_session


class TestGetCORSInstructions:
    """Test CORS instructions generation"""
    
    def test_get_cors_instructions_returns_string(self, cors_validator):
        """Test instructions are returned as string"""
        instructions = cors_validator.get_cors_instructions()
        
        assert isinstance(instructions, str)
        assert len(instructions) > 0
    
    def test_get_cors_instructions_contains_key_sections(self, cors_validator):
        """Test instructions contain all key sections"""
        instructions = cors_validator.get_cors_instructions()
        
        # Check for key sections
        assert 'CORS Configuration Required' in instructions
        assert 'STEP 1: Enable CORS in ComfyUI Desktop' in instructions
        assert 'STEP 2: Verify CORS is Enabled' in instructions
        assert 'TROUBLESHOOTING' in instructions
        assert 'SECURITY NOTES' in instructions
    
    def test_get_cors_instructions_contains_command_line_flag(self, cors_validator):
        """Test instructions mention --enable-cors-header flag"""
        instructions = cors_validator.get_cors_instructions()
        
        assert '--enable-cors-header' in instructions
    
    def test_get_cors_instructions_contains_platform_specific_commands(self, cors_validator):
        """Test instructions include platform-specific commands"""
        instructions = cors_validator.get_cors_instructions()
        
        # Check for platform-specific sections
        assert 'Windows:' in instructions
        assert 'macOS/Linux:' in instructions
        assert 'ComfyUI.exe' in instructions
        assert './ComfyUI' in instructions
    
    def test_get_cors_instructions_contains_troubleshooting_steps(self, cors_validator):
        """Test instructions include troubleshooting steps"""
        instructions = cors_validator.get_cors_instructions()
        
        # Check for common issues
        assert 'CORS headers still not present' in instructions
        assert 'Access-Control-Allow-Origin' in instructions
        assert 'CORS policy' in instructions
    
    def test_get_cors_instructions_contains_verification_steps(self, cors_validator):
        """Test instructions include verification steps"""
        instructions = cors_validator.get_cors_instructions()
        
        assert 'test-connection' in instructions
        assert 'fetch' in instructions or 'browser console' in instructions


class TestTestBrowserRequest:
    """Test browser request simulation"""
    
    @pytest.mark.asyncio
    async def test_browser_request_success_wildcard_origin(self, cors_validator, mock_connection_manager):
        """Test browser request succeeds with wildcard origin"""
        # Mock session and response
        mock_session = MagicMock()
        mock_response = MagicMock()
        mock_response.headers = {
            'Access-Control-Allow-Origin': '*'
        }
        
        # Setup async context manager
        mock_context = AsyncMock()
        mock_context.__aenter__.return_value = mock_response
        mock_session.get.return_value = mock_context
        mock_session.closed = False
        mock_connection_manager._session = mock_session
        
        # Test browser request
        result = await cors_validator.test_browser_request()
        
        assert result is True
    
    @pytest.mark.asyncio
    async def test_browser_request_success_matching_origin(self, cors_validator, mock_connection_manager):
        """Test browser request succeeds with matching origin"""
        # Mock session and response
        mock_session = MagicMock()
        mock_response = MagicMock()
        mock_response.headers = {
            'Access-Control-Allow-Origin': 'http://localhost:3000'
        }
        
        # Setup async context manager
        mock_context = AsyncMock()
        mock_context.__aenter__.return_value = mock_response
        mock_session.get.return_value = mock_context
        mock_session.closed = False
        mock_connection_manager._session = mock_session
        
        # Test browser request
        result = await cors_validator.test_browser_request(origin="http://localhost:3000")
        
        assert result is True
    
    @pytest.mark.asyncio
    async def test_browser_request_fails_mismatched_origin(self, cors_validator, mock_connection_manager):
        """Test browser request fails with mismatched origin"""
        # Mock session and response
        mock_session = MagicMock()
        mock_response = MagicMock()
        mock_response.headers = {
            'Access-Control-Allow-Origin': 'http://other-origin.com'
        }
        
        # Setup async context manager
        mock_context = AsyncMock()
        mock_context.__aenter__.return_value = mock_response
        mock_session.get.return_value = mock_context
        mock_session.closed = False
        mock_connection_manager._session = mock_session
        
        # Test browser request
        result = await cors_validator.test_browser_request(origin="http://localhost:3000")
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_browser_request_fails_no_cors_header(self, cors_validator, mock_connection_manager):
        """Test browser request fails when no CORS header present"""
        # Mock session and response
        mock_session = MagicMock()
        mock_response = MagicMock()
        mock_response.headers = {}
        
        # Setup async context manager
        mock_context = AsyncMock()
        mock_context.__aenter__.return_value = mock_response
        mock_session.get.return_value = mock_context
        mock_session.closed = False
        mock_connection_manager._session = mock_session
        
        # Test browser request
        result = await cors_validator.test_browser_request()
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_browser_request_handles_connection_error(self, cors_validator, mock_connection_manager):
        """Test browser request handles connection errors"""
        # Mock session that raises error
        mock_session = MagicMock()
        mock_session.get.side_effect = ClientError("Connection failed")
        mock_session.closed = False
        mock_connection_manager._session = mock_session
        
        # Test browser request
        result = await cors_validator.test_browser_request()
        
        assert result is False


class TestGetTroubleshootingSteps:
    """Test troubleshooting steps generation"""
    
    def test_get_troubleshooting_missing_headers(self, cors_validator):
        """Test troubleshooting steps for missing headers"""
        steps = cors_validator.get_troubleshooting_steps('missing_headers')
        
        assert isinstance(steps, list)
        assert len(steps) > 0
        assert any('--enable-cors-header' in step for step in steps)
    
    def test_get_troubleshooting_wrong_origin(self, cors_validator):
        """Test troubleshooting steps for wrong origin"""
        steps = cors_validator.get_troubleshooting_steps('wrong_origin')
        
        assert isinstance(steps, list)
        assert len(steps) > 0
        assert any('origin' in step.lower() for step in steps)
    
    def test_get_troubleshooting_connection_failed(self, cors_validator):
        """Test troubleshooting steps for connection failure"""
        steps = cors_validator.get_troubleshooting_steps('connection_failed')
        
        assert isinstance(steps, list)
        assert len(steps) > 0
        assert any('running' in step.lower() for step in steps)
    
    def test_get_troubleshooting_browser_error(self, cors_validator):
        """Test troubleshooting steps for browser errors"""
        steps = cors_validator.get_troubleshooting_steps('browser_error')
        
        assert isinstance(steps, list)
        assert len(steps) > 0
        assert any('browser' in step.lower() for step in steps)
    
    def test_get_troubleshooting_unknown_error(self, cors_validator):
        """Test troubleshooting steps for unknown error type"""
        steps = cors_validator.get_troubleshooting_steps('unknown_error_type')
        
        assert isinstance(steps, list)
        assert len(steps) > 0
        # Should return default steps


class TestCORSValidationResult:
    """Test CORSValidationResult dataclass"""
    
    def test_cors_validation_result_creation(self):
        """Test creating CORSValidationResult"""
        result = CORSValidationResult(
            valid=True,
            headers_present=['Access-Control-Allow-Origin'],
            headers_missing=[],
            error_message=None,
            instructions=""
        )
        
        assert result.valid is True
        assert len(result.headers_present) == 1
        assert len(result.headers_missing) == 0
        assert result.error_message is None
        assert result.instructions == ""
    
    def test_cors_validation_result_with_errors(self):
        """Test CORSValidationResult with errors"""
        result = CORSValidationResult(
            valid=False,
            headers_present=[],
            headers_missing=['Access-Control-Allow-Origin', 'Access-Control-Allow-Methods'],
            error_message="Missing headers",
            instructions="Enable CORS..."
        )
        
        assert result.valid is False
        assert len(result.headers_missing) == 2
        assert result.error_message == "Missing headers"
        assert len(result.instructions) > 0
