"""
ComfyUI Connection Manager

Manages connection to ComfyUI server, including health checks, authentication,
and error handling.
"""

import asyncio
import logging
from typing import Any, Dict, Optional
from urllib.parse import urljoin

import aiohttp


logger = logging.getLogger(__name__)


class ConnectionError(Exception):
    """Raised when connection to ComfyUI server fails."""
    pass


class AuthenticationError(Exception):
    """Raised when authentication with ComfyUI server fails."""
    pass


class TimeoutError(Exception):
    """Raised when connection or request times out."""
    pass


class ComfyUIConnectionManager:
    """Manages connection to ComfyUI server."""
    
    def __init__(
        self, 
        base_url: str, 
        timeout: int = 10, 
        auth: Optional[Dict[str, str]] = None
    ):
        """
        Initialize connection manager.
        
        Args:
            base_url: ComfyUI server URL (e.g., http://localhost:8188)
            timeout: Connection timeout in seconds
            auth: Optional authentication credentials with 'username' and 'password' keys
        """
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.auth = auth
        self.session: Optional[aiohttp.ClientSession] = None
        
        logger.info(f"Initialized ComfyUIConnectionManager for {self.base_url}")
    
    async def connect(self) -> bool:
        """
        Test connection to ComfyUI server.
        
        Returns:
            True if connection successful, False otherwise
        
        Raises:
            ConnectionError: If server is unreachable
            AuthenticationError: If authentication fails
            TimeoutError: If connection times out
        """
        logger.info(f"Attempting to connect to ComfyUI at {self.base_url}")
        
        try:
            # Create session if it doesn't exist
            if self.session is None:
                timeout_config = aiohttp.ClientTimeout(total=self.timeout)
                
                # Set up authentication if provided
                auth_obj = None
                if self.auth:
                    auth_obj = aiohttp.BasicAuth(
                        login=self.auth.get('username', ''),
                        password=self.auth.get('password', '')
                    )
                
                self.session = aiohttp.ClientSession(
                    timeout=timeout_config,
                    auth=auth_obj
                )
            
            # Test connection with a simple health check
            try:
                async with self.session.get(f"{self.base_url}/system_stats") as response:
                    if response.status == 401:
                        raise AuthenticationError(
                            f"Authentication failed for {self.base_url}. "
                            "Please check your credentials."
                        )
                    elif response.status == 200:
                        logger.info(f"Successfully connected to ComfyUI at {self.base_url}")
                        return True
                    else:
                        raise ConnectionError(
                            f"Unexpected response status {response.status} from {self.base_url}"
                        )
            
            except asyncio.TimeoutError:
                raise TimeoutError(
                    f"Connection to {self.base_url} timed out after {self.timeout} seconds."
                )
            except aiohttp.ClientConnectorError as e:
                raise ConnectionError(
                    f"Cannot connect to ComfyUI at {self.base_url}. "
                    "Please ensure ComfyUI is running."
                )
        
        except (AuthenticationError, TimeoutError, ConnectionError):
            # Re-raise our custom exceptions
            raise
        except Exception as e:
            logger.error(f"Unexpected error during connection: {e}")
            raise ConnectionError(
                f"Failed to connect to ComfyUI at {self.base_url}: {str(e)}"
            )
    
    async def check_health(self) -> Dict[str, Any]:
        """
        Check ComfyUI server health and capabilities.
        
        Returns:
            Dictionary with server info (version, models, system stats)
        
        Raises:
            ConnectionError: If health check fails
        """
        logger.info("Checking ComfyUI server health")
        
        try:
            response_data = await self.get("/system_stats")
            logger.info("Health check successful")
            return response_data
        
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            raise ConnectionError(f"Health check failed: {str(e)}")
    
    async def get(self, endpoint: str) -> Dict[str, Any]:
        """
        Make GET request to ComfyUI endpoint.
        
        Args:
            endpoint: API endpoint path (e.g., '/system_stats')
        
        Returns:
            Response data as dictionary
        
        Raises:
            ConnectionError: If request fails
            AuthenticationError: If authentication fails
            TimeoutError: If request times out
        """
        if self.session is None:
            await self.connect()
        
        url = urljoin(self.base_url + '/', endpoint.lstrip('/'))
        logger.debug(f"GET request to {url}")
        
        try:
            async with self.session.get(url) as response:
                if response.status == 401:
                    raise AuthenticationError(
                        f"Authentication failed for {url}. Please check your credentials."
                    )
                elif response.status == 404:
                    raise ConnectionError(f"Endpoint not found: {url}")
                elif response.status >= 400:
                    error_text = await response.text()
                    raise ConnectionError(
                        f"Request failed with status {response.status}: {error_text}"
                    )
                
                # Try to parse JSON response
                try:
                    data = await response.json()
                    return data
                except aiohttp.ContentTypeError:
                    # If not JSON, return text as dict
                    text = await response.text()
                    return {"response": text}
        
        except asyncio.TimeoutError:
            raise TimeoutError(
                f"Request to {url} timed out after {self.timeout} seconds."
            )
        except aiohttp.ClientConnectorError:
            raise ConnectionError(
                f"Cannot connect to ComfyUI at {self.base_url}. "
                "Please ensure ComfyUI is running."
            )
        except (AuthenticationError, TimeoutError, ConnectionError):
            raise
        except Exception as e:
            logger.error(f"Unexpected error during GET request: {e}")
            raise ConnectionError(f"GET request failed: {str(e)}")
    
    async def post(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Make POST request to ComfyUI endpoint.
        
        Args:
            endpoint: API endpoint path (e.g., '/prompt')
            data: Request payload as dictionary
        
        Returns:
            Response data as dictionary
        
        Raises:
            ConnectionError: If request fails
            AuthenticationError: If authentication fails
            TimeoutError: If request times out
        """
        if self.session is None:
            await self.connect()
        
        url = urljoin(self.base_url + '/', endpoint.lstrip('/'))
        logger.debug(f"POST request to {url}")
        
        try:
            async with self.session.post(url, json=data) as response:
                if response.status == 401:
                    raise AuthenticationError(
                        f"Authentication failed for {url}. Please check your credentials."
                    )
                elif response.status == 404:
                    raise ConnectionError(f"Endpoint not found: {url}")
                elif response.status >= 400:
                    error_text = await response.text()
                    raise ConnectionError(
                        f"Request failed with status {response.status}: {error_text}"
                    )
                
                # Try to parse JSON response
                try:
                    response_data = await response.json()
                    return response_data
                except aiohttp.ContentTypeError:
                    # If not JSON, return text as dict
                    text = await response.text()
                    return {"response": text}
        
        except asyncio.TimeoutError:
            raise TimeoutError(
                f"Request to {url} timed out after {self.timeout} seconds."
            )
        except aiohttp.ClientConnectorError:
            raise ConnectionError(
                f"Cannot connect to ComfyUI at {self.base_url}. "
                "Please ensure ComfyUI is running."
            )
        except (AuthenticationError, TimeoutError, ConnectionError):
            raise
        except Exception as e:
            logger.error(f"Unexpected error during POST request: {e}")
            raise ConnectionError(f"POST request failed: {str(e)}")
    
    async def close(self):
        """Close connection and cleanup resources."""
        if self.session is not None:
            logger.info("Closing ComfyUI connection")
            await self.session.close()
            self.session = None
            logger.info("Connection closed successfully")
    
    async def __aenter__(self):
        """Async context manager entry."""
        await self.connect()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
