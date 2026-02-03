"""
CORS Validator for ComfyUI Desktop Integration.

This module validates CORS configuration and provides guidance for
enabling CORS in ComfyUI Desktop.
"""

import aiohttp
import logging
from typing import List, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class CORSValidationResult:
    """
    Result of CORS validation.
    
    Validates: Requirements 2.1, 2.3
    """
    valid: bool
    headers_present: List[str]
    headers_missing: List[str]
    error_message: Optional[str]
    instructions: str


class CORSValidator:
    """
    Validates CORS configuration for ComfyUI Desktop.
    
    Provides:
    - CORS header validation
    - Detailed validation results
    - Setup instructions and troubleshooting
    
    Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
    """
    
    # Required CORS headers
    REQUIRED_HEADERS = {
        'access-control-allow-origin': 'Access-Control-Allow-Origin',
        'access-control-allow-methods': 'Access-Control-Allow-Methods',
        'access-control-allow-headers': 'Access-Control-Allow-Headers'
    }
    
    def __init__(self, connection_manager):
        """
        Initialize CORSValidator.
        
        Args:
            connection_manager: ConnectionManager instance for making requests
        """
        self.connection_manager = connection_manager
    
    async def validate_cors(self, origin: str = "http://localhost:3000") -> CORSValidationResult:
        """
        Validate CORS headers from ComfyUI.
        
        Makes an OPTIONS request to check for required CORS headers.
        
        Args:
            origin: Origin to use in CORS check (default: http://localhost:3000)
            
        Returns:
            CORSValidationResult with validation status and details
            
        Validates: Requirements 2.1, 2.3
        """
        logger.info(f"Validating CORS configuration for {self.connection_manager.config.url}")
        
        headers_present = []
        headers_missing = []
        error_message = None
        
        try:
            # Create session if needed
            if not self.connection_manager._session or self.connection_manager._session.closed:
                self.connection_manager._session = aiohttp.ClientSession()
            
            # Make OPTIONS request to check CORS headers
            async with self.connection_manager._session.options(
                f"{self.connection_manager.config.url}/system_stats",
                headers={
                    'Origin': origin,
                    'Access-Control-Request-Method': 'POST',
                    'Access-Control-Request-Headers': 'Content-Type'
                },
                timeout=aiohttp.ClientTimeout(total=5)
            ) as response:
                # Check for required headers
                response_headers = {k.lower(): v for k, v in response.headers.items()}
                
                for header_key, header_name in self.REQUIRED_HEADERS.items():
                    if header_key in response_headers:
                        headers_present.append(header_name)
                        logger.debug(f"Found CORS header: {header_name} = {response_headers[header_key]}")
                    else:
                        headers_missing.append(header_name)
                        logger.warning(f"Missing CORS header: {header_name}")
                
                # Determine if CORS is valid
                valid = len(headers_missing) == 0
                
                if not valid:
                    error_message = f"Missing required CORS headers: {', '.join(headers_missing)}"
                    logger.warning(error_message)
                else:
                    logger.info("CORS validation successful")
                
                # Get instructions
                instructions = self.get_cors_instructions() if not valid else ""
                
                return CORSValidationResult(
                    valid=valid,
                    headers_present=headers_present,
                    headers_missing=headers_missing,
                    error_message=error_message,
                    instructions=instructions
                )
                
        except aiohttp.ClientError as e:
            error_message = f"Failed to validate CORS: {str(e)}"
            logger.error(error_message)
            
            # Return result indicating validation failed
            return CORSValidationResult(
                valid=False,
                headers_present=[],
                headers_missing=list(self.REQUIRED_HEADERS.values()),
                error_message=error_message,
                instructions=self.get_cors_instructions()
            )
            
        except Exception as e:
            error_message = f"Unexpected error during CORS validation: {str(e)}"
            logger.error(error_message)
            
            return CORSValidationResult(
                valid=False,
                headers_present=[],
                headers_missing=list(self.REQUIRED_HEADERS.values()),
                error_message=error_message,
                instructions=self.get_cors_instructions()
            )
    
    def get_cors_instructions(self) -> str:
        """
        Get instructions for enabling CORS in ComfyUI Desktop.
        
        Returns:
            Detailed setup instructions as string
            
        Validates: Requirements 2.2, 2.4, 2.5
        """
        instructions = """
╔══════════════════════════════════════════════════════════════════════════════╗
║                    CORS Configuration Required                                ║
╚══════════════════════════════════════════════════════════════════════════════╝

ComfyUI Desktop needs CORS (Cross-Origin Resource Sharing) enabled to allow
browser-based interfaces to communicate with the backend.

┌──────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: Enable CORS in ComfyUI Desktop                                       │
└──────────────────────────────────────────────────────────────────────────────┘

Option A: Command Line Flag (Recommended)
  Start ComfyUI Desktop with the --enable-cors-header flag:
  
  Windows:
    ComfyUI.exe --enable-cors-header
  
  macOS/Linux:
    ./ComfyUI --enable-cors-header
  
  Or if using Python directly:
    python main.py --enable-cors-header

Option B: Configuration File
  1. Locate your ComfyUI configuration file (usually extra_model_paths.yaml)
  2. Add the following setting:
     
     cors:
       enabled: true
       allow_origins: "*"
  
  3. Restart ComfyUI Desktop

┌──────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: Verify CORS is Enabled                                               │
└──────────────────────────────────────────────────────────────────────────────┘

After restarting ComfyUI Desktop with CORS enabled:

1. Run the connection test command:
   python storycore.py test-connection

2. Or check manually in browser console:
   fetch('http://localhost:8000/system_stats', {
     method: 'OPTIONS',
     headers: {'Origin': 'http://localhost:3000'}
   }).then(r => console.log(r.headers))

┌──────────────────────────────────────────────────────────────────────────────┐
│ TROUBLESHOOTING                                                               │
└──────────────────────────────────────────────────────────────────────────────┘

Issue: CORS headers still not present after restart
Solution:
  • Ensure you're using the latest version of ComfyUI Desktop
  • Check that no firewall is blocking the connection
  • Try using a different port: --port 8001 --enable-cors-header
  • Check ComfyUI logs for any error messages

Issue: "Access-Control-Allow-Origin" header is missing
Solution:
  • Verify the --enable-cors-header flag is actually being used
  • Check if you have any proxy or reverse proxy that might strip headers
  • Try accessing from the same machine first (localhost)

Issue: Browser shows "CORS policy" error
Solution:
  • Clear browser cache and reload the page
  • Check browser console for specific CORS error details
  • Ensure you're accessing via http:// not https:// (unless configured)
  • Try a different browser to rule out browser-specific issues

Issue: ComfyUI Desktop won't start with --enable-cors-header
Solution:
  • Check ComfyUI version (CORS support added in recent versions)
  • Update ComfyUI Desktop to the latest version
  • Check command line syntax (no typos in flag)
  • Review ComfyUI startup logs for error messages

┌──────────────────────────────────────────────────────────────────────────────┐
│ SECURITY NOTES                                                                │
└──────────────────────────────────────────────────────────────────────────────┘

• CORS with "*" allows any origin - suitable for local development
• For production, specify exact origins: --cors-origins http://myapp.com
• Never expose ComfyUI Desktop directly to the internet without authentication
• Use a reverse proxy (nginx, Apache) for production deployments

┌──────────────────────────────────────────────────────────────────────────────┐
│ ADDITIONAL RESOURCES                                                          │
└──────────────────────────────────────────────────────────────────────────────┘

• ComfyUI Documentation: https://github.com/comfyanonymous/ComfyUI
• CORS Explained: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
• StoryCore Setup Guide: docs/setup/comfyui-integration.md

╔══════════════════════════════════════════════════════════════════════════════╗
║ Need Help? Check the troubleshooting guide or open an issue on GitHub        ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""
        return instructions.strip()
    
    async def test_browser_request(self, origin: str = "http://localhost:3000") -> bool:
        """
        Test CORS from browser context.
        
        Simulates a browser request to verify CORS is working correctly.
        
        Args:
            origin: Origin to test from
            
        Returns:
            True if CORS allows the request, False otherwise
            
        Validates: Requirement 2.3
        """
        logger.info(f"Testing browser CORS request from origin: {origin}")
        
        try:
            # Create session if needed
            if not self.connection_manager._session or self.connection_manager._session.closed:
                self.connection_manager._session = aiohttp.ClientSession()
            
            # Make a GET request with Origin header (simulating browser)
            async with self.connection_manager._session.get(
                f"{self.connection_manager.config.url}/system_stats",
                headers={'Origin': origin},
                timeout=aiohttp.ClientTimeout(total=5)
            ) as response:
                # Check if response includes CORS headers
                response_headers = {k.lower(): v for k, v in response.headers.items()}
                
                # Check for Access-Control-Allow-Origin
                allow_origin = response_headers.get('access-control-allow-origin')
                
                if allow_origin:
                    # Check if origin is allowed
                    if allow_origin == '*' or allow_origin == origin:
                        logger.info(f"Browser request would be allowed from {origin}")
                        return True
                    else:
                        logger.warning(f"Origin {origin} not allowed. Allowed: {allow_origin}")
                        return False
                else:
                    logger.warning("No Access-Control-Allow-Origin header in response")
                    return False
                    
        except aiohttp.ClientError as e:
            logger.error(f"Failed to test browser request: {e}")
            return False
            
        except Exception as e:
            logger.error(f"Unexpected error testing browser request: {e}")
            return False
    
    def get_troubleshooting_steps(self, error_type: str) -> List[str]:
        """
        Get specific troubleshooting steps for common CORS issues.
        
        Args:
            error_type: Type of CORS error encountered
            
        Returns:
            List of troubleshooting steps
            
        Validates: Requirement 2.5
        """
        troubleshooting = {
            'missing_headers': [
                "Restart ComfyUI Desktop with --enable-cors-header flag",
                "Verify the flag is in the startup command",
                "Check ComfyUI logs for any errors",
                "Update ComfyUI Desktop to the latest version"
            ],
            'wrong_origin': [
                "Check the Access-Control-Allow-Origin header value",
                "Ensure your app origin matches the allowed origin",
                "Use --cors-origins flag to specify allowed origins",
                "For development, use '*' to allow all origins"
            ],
            'connection_failed': [
                "Verify ComfyUI Desktop is running",
                "Check the URL and port are correct",
                "Ensure no firewall is blocking the connection",
                "Try accessing http://localhost:8000 directly in browser"
            ],
            'browser_error': [
                "Clear browser cache and reload",
                "Check browser console for detailed error message",
                "Try a different browser",
                "Disable browser extensions that might interfere"
            ]
        }
        
        return troubleshooting.get(error_type, [
            "Check ComfyUI Desktop is running with CORS enabled",
            "Verify network connectivity",
            "Review ComfyUI logs for errors",
            "Consult the setup documentation"
        ])
