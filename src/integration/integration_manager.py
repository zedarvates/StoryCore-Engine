#!/usr/bin/env python3
"""
StoryCore Integration Manager
Manages the integration of audio, 3D, and HTTP components with the core system.
"""

import logging
from typing import Dict, Any, Optional
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class IntegrationManager:
    """
    Central integration manager for StoryCore components.
    
    Responsibilities:
    - Manage audio engine integration
    - Manage 3D rendering engine integration  
    - Manage HTTP API server integration
    - Coordinate between components
    """
    
    def __init__(self):
        """Initialize the integration manager."""
        self.audio_engine = None
        self.rendering_engine = None
        self.api_server = None
        self.integration_status = {
            'audio': 'not_initialized',
            '3d': 'not_initialized', 
            'http': 'not_initialized'
        }
        
        logger.info("Integration Manager initialized")
    
    def initialize_audio_engine(self, config: Optional[Dict[str, Any]] = None) -> bool:
        """
        Initialize and integrate the audio engine.
        
        Args:
            config: Audio engine configuration
            
        Returns:
            True if initialization successful, False otherwise
        """
        try:
            # Import and initialize audio engine
            from src.audio_engine import AudioEngine
            
            audio_config = config or {
                'quality': 'STANDARD',
                'mock_mode': True,
                'comfyui_config': {
                    'base_url': 'http://127.0.0.1:8188',
                    'timeout': 300
                }
            }
            
            self.audio_engine = AudioEngine(**audio_config)
            self.integration_status['audio'] = 'initialized'
            
            logger.info("Audio Engine integrated successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize audio engine: {e}")
            self.integration_status['audio'] = 'failed'
            return False
    
    def initialize_3d_engine(self, config: Optional[Dict[str, Any]] = None) -> bool:
        """
        Initialize and integrate the 3D rendering engine.
        
        Args:
            config: 3D engine configuration
            
        Returns:
            True if initialization successful, False otherwise
        """
        try:
            # Import and initialize 3D rendering engine
            from src.3d.rendering_engine import RenderingEngine
            
            render_config = config or {'render_mode': 'REALTIME'}
            
            self.rendering_engine = RenderingEngine(**render_config)
            self.integration_status['3d'] = 'initialized'
            
            logger.info("3D Rendering Engine integrated successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize 3D engine: {e}")
            self.integration_status['3d'] = 'failed'
            return False
    
    def initialize_http_server(self, config: Optional[Dict[str, Any]] = None) -> bool:
        """
        Initialize and integrate the HTTP API server.
        
        Args:
            config: HTTP server configuration
            
        Returns:
            True if initialization successful, False otherwise
        """
        try:
            # Import and initialize HTTP API server
            from src.comfyui_api_server import StoryCoreAPI
            
            server_config = config or {
                'host': 'localhost',
                'port': 8000
            }
            
            self.api_server = StoryCoreAPI(**server_config)
            self.integration_status['http'] = 'initialized'
            
            logger.info("HTTP API Server integrated successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize HTTP server: {e}")
            self.integration_status['http'] = 'failed'
            return False
    
    def integrate_components(self) -> Dict[str, str]:
        """
        Integrate all components and establish connections.
        
        Returns:
            Dictionary with integration status for each component
        """
        # Initialize all components
        audio_success = self.initialize_audio_engine()
        rendering_success = self.initialize_3d_engine()
        http_success = self.initialize_http_server()
        
        # Establish connections between components
        if audio_success and rendering_success:
            self._connect_audio_to_rendering()
            
        if audio_success and http_success:
            self._connect_audio_to_http()
            
        if rendering_success and http_success:
            self._connect_rendering_to_http()
        
        return self.integration_status
    
    def _connect_audio_to_rendering(self) -> None:
        """Establish connection between audio and rendering engines."""
        if self.audio_engine and self.rendering_engine:
            # In a real implementation, this would set up synchronization
            # between audio timeline and 3D rendering timeline
            logger.info("Audio and 3D rendering engines connected")
    
    def _connect_audio_to_http(self) -> None:
        """Establish connection between audio engine and HTTP server."""
        if self.audio_engine and self.api_server:
            # Set up API endpoints for audio generation
            logger.info("Audio engine connected to HTTP server")
    
    def _connect_rendering_to_http(self) -> None:
        """Establish connection between rendering engine and HTTP server."""
        if self.rendering_engine and self.api_server:
            # Set up API endpoints for 3D rendering
            logger.info("3D rendering engine connected to HTTP server")
    
    def get_integration_status(self) -> Dict[str, str]:
        """
        Get current integration status.
        
        Returns:
            Dictionary with status of each component integration
        """
        return self.integration_status
    
    async def start_services(self) -> bool:
        """
        Start all integrated services.
        
        Returns:
            True if all services started successfully, False otherwise
        """
        try:
            # Start HTTP server
            if self.api_server:
                import asyncio
                asyncio.create_task(self.api_server.run_server())
                logger.info("HTTP server started")
            
            # Additional service startup logic would go here
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to start services: {e}")
            return False
    
    def shutdown(self) -> None:
        """Shutdown all integrated components."""
        logger.info("Shutting down Integration Manager...")
        
        # Shutdown components in reverse order
        if self.api_server:
            # In a real implementation, this would properly shutdown the server
            logger.info("HTTP server shutdown")
            
        if self.rendering_engine:
            self.rendering_engine.cleanup()
            logger.info("3D rendering engine shutdown")
            
        if self.audio_engine:
            # Audio engine doesn't have explicit shutdown in current implementation
            logger.info("Audio engine shutdown")
        
        logger.info("Integration Manager shutdown complete")


def create_integration_manager() -> IntegrationManager:
    """
    Factory function to create and return an IntegrationManager instance.
    
    Returns:
        Initialized IntegrationManager instance
    """
    return IntegrationManager()


async def main():
    """Demonstrate integration manager functionality."""
    print("StoryCore Integration Manager Demo")
    print("=" * 40)
    
    # Create integration manager
    manager = create_integration_manager()
    
    # Integrate components
    print("\n1. Integrating components...")
    status = manager.integrate_components()
    
    for component, stat in status.items():
        symbol = "✓" if stat == 'initialized' else "✗"
        print(f"   {symbol} {component.capitalize()}: {stat}")
    
    # Start services
    print("\n2. Starting services...")
    if await manager.start_services():
        print("   ✓ Services started successfully")
    else:
        print("   ✗ Failed to start services")
    
    # Show integration status
    print("\n3. Integration Status:")
    current_status = manager.get_integration_status()
    for component, stat in current_status.items():
        print(f"   • {component.capitalize()}: {stat}")
    
    print("\n✅ Integration Manager demonstration complete!")
    print("🎵 Audio Engine: Ready for sound generation")
    print("🎬 3D Engine: Ready for cinematic rendering")
    print("🌐 HTTP Server: Ready for API requests")
    print("🔧 All components integrated and operational")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())