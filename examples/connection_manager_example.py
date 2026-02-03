"""
Example usage of ConnectionManager for ComfyUI Desktop integration.

This example demonstrates:
- Creating a ConnectionManager with configuration
- Connecting to ComfyUI Desktop
- Registering status callbacks
- Starting health monitoring
- Handling connection failures with fallback
- Background reconnection attempts
"""

import asyncio
import logging
from pathlib import Path
import sys

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.end_to_end.connection_manager import ConnectionManager, ComfyUIConfig
from src.end_to_end.data_models import ComfyUIStatus

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def status_change_callback(status: ComfyUIStatus):
    """
    Callback function for status changes.
    
    This will be called whenever the connection status changes.
    """
    if status.available:
        logger.info(f"✓ ComfyUI is AVAILABLE at {status.url}")
        logger.info(f"  Version: {status.version}")
        logger.info(f"  Queue size: {status.queue_size}")
    else:
        logger.warning(f"✗ ComfyUI is UNAVAILABLE at {status.url}")
        logger.warning(f"  Error: {status.error_message}")


async def main():
    """Main example function"""
    
    # Create configuration
    # Default: localhost:8000
    config = ComfyUIConfig(
        host="localhost",
        port=8000,
        timeout=10,
        max_retries=3,
        fallback_mode="placeholder"
    )
    
    # Validate configuration
    errors = config.validate()
    if errors:
        logger.error("Configuration validation failed:")
        for error in errors:
            logger.error(f"  - {error}")
        return
    
    logger.info(f"Configuration valid: {config.url}")
    
    # Create ConnectionManager
    manager = ConnectionManager(config)
    
    # Register status callback
    manager.register_status_callback(status_change_callback)
    
    # Attempt initial connection
    logger.info("Attempting initial connection...")
    status = await manager.connect()
    
    if status.available:
        logger.info("Successfully connected to ComfyUI Desktop!")
        
        # Start health monitoring (checks every 5 seconds)
        logger.info("Starting health monitoring...")
        await manager.start_health_monitoring(interval=5)
        
        # Monitor for 30 seconds
        logger.info("Monitoring connection for 30 seconds...")
        await asyncio.sleep(30)
        
        # Stop monitoring
        logger.info("Stopping health monitoring...")
        await manager.stop_health_monitoring()
        
    else:
        logger.warning("Failed to connect to ComfyUI Desktop")
        
        # Check if we should use fallback
        if manager.should_use_fallback():
            warning = manager.trigger_fallback_warning()
            logger.warning(warning)
            
            # Start background reconnection attempts
            logger.info("Starting background reconnection attempts...")
            await manager.start_background_reconnection(interval=10)
            
            # Wait for reconnection (or timeout after 60 seconds)
            logger.info("Waiting for reconnection (60 seconds max)...")
            for i in range(6):
                await asyncio.sleep(10)
                current_status = manager.get_status()
                
                if current_status.available:
                    logger.info("Reconnection successful!")
                    break
                else:
                    logger.info(f"Still disconnected... ({(i+1)*10}s elapsed)")
            
            # Stop reconnection attempts
            await manager.stop_background_reconnection()
    
    # Disconnect and cleanup
    logger.info("Disconnecting...")
    await manager.disconnect()
    
    logger.info("Example complete!")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
