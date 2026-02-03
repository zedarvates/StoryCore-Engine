# ConnectionManager Documentation

## Overview

The `ConnectionManager` class provides robust connection lifecycle management for ComfyUI Desktop integration. It handles connection establishment, health monitoring, automatic reconnection, and fallback behavior when the backend is unavailable.

## Features

- **Async Connection Management**: Non-blocking connection with configurable timeout
- **Health Monitoring**: Periodic health checks with status callbacks
- **Automatic Reconnection**: Background reconnection attempts when connection is lost
- **Fallback Support**: Configurable fallback modes (placeholder, skip, abort)
- **Status Callbacks**: Register callbacks to receive status change notifications
- **Graceful Shutdown**: Clean resource cleanup on disconnect

## Configuration

### ComfyUIConfig

Configuration class for ComfyUI connection settings.

```python
from src.end_to_end.connection_manager import ComfyUIConfig

config = ComfyUIConfig(
    host="localhost",           # ComfyUI host (default: "localhost")
    port=8000,                  # ComfyUI port (default: 8000)
    timeout=30,                 # Connection timeout in seconds (default: 30)
    max_retries=3,              # Maximum retry attempts (default: 3)
    retry_backoff=2.0,          # Exponential backoff multiplier (default: 2.0)
    enable_cors_check=True,     # Enable CORS validation (default: True)
    auto_download_models=True,  # Auto-download missing models (default: True)
    auto_deploy_workflows=True, # Auto-deploy workflows (default: True)
    fallback_mode="placeholder" # Fallback mode (default: "placeholder")
)
```

### Configuration Validation

Validate configuration before use:

```python
errors = config.validate()
if errors:
    for error in errors:
        print(f"Configuration error: {error}")
else:
    print("Configuration is valid")
```

### Fallback Modes

- **placeholder**: Generate placeholder images when backend unavailable
- **skip**: Skip generation when backend unavailable
- **abort**: Abort operation when backend unavailable

## Usage

### Basic Connection

```python
import asyncio
from src.end_to_end.connection_manager import ConnectionManager, ComfyUIConfig

async def connect_to_comfyui():
    # Create configuration
    config = ComfyUIConfig()
    
    # Create manager
    manager = ConnectionManager(config)
    
    # Attempt connection
    status = await manager.connect()
    
    if status.available:
        print(f"Connected to ComfyUI {status.version}")
        print(f"Queue size: {status.queue_size}")
    else:
        print(f"Connection failed: {status.error_message}")
    
    # Cleanup
    await manager.disconnect()

asyncio.run(connect_to_comfyui())
```

### Health Monitoring

```python
async def monitor_health():
    config = ComfyUIConfig()
    manager = ConnectionManager(config)
    
    # Connect
    await manager.connect()
    
    # Start health monitoring (checks every 5 seconds)
    await manager.start_health_monitoring(interval=5)
    
    # Monitor for 60 seconds
    await asyncio.sleep(60)
    
    # Stop monitoring
    await manager.stop_health_monitoring()
    
    # Cleanup
    await manager.disconnect()
```

### Status Callbacks

Register callbacks to receive status change notifications:

```python
def on_status_change(status):
    if status.available:
        print(f"✓ ComfyUI available: {status.url}")
    else:
        print(f"✗ ComfyUI unavailable: {status.error_message}")

async def use_callbacks():
    config = ComfyUIConfig()
    manager = ConnectionManager(config)
    
    # Register callback
    manager.register_status_callback(on_status_change)
    
    # Connect (callback will be triggered)
    await manager.connect()
    
    # Start monitoring (callback triggered on status changes)
    await manager.start_health_monitoring(interval=5)
    
    await asyncio.sleep(30)
    
    # Unregister callback
    manager.unregister_status_callback(on_status_change)
    
    await manager.disconnect()
```

### Fallback Handling

```python
async def handle_fallback():
    config = ComfyUIConfig(fallback_mode="placeholder")
    manager = ConnectionManager(config)
    
    # Attempt connection
    status = await manager.connect()
    
    if not status.available:
        # Check if fallback should be used
        if manager.should_use_fallback():
            # Get fallback mode
            mode = manager.get_fallback_mode()
            print(f"Using fallback mode: {mode}")
            
            # Trigger fallback warning
            warning = manager.trigger_fallback_warning()
            print(warning)
    
    await manager.disconnect()
```

### Background Reconnection

```python
async def auto_reconnect():
    config = ComfyUIConfig()
    manager = ConnectionManager(config)
    
    # Initial connection attempt
    status = await manager.connect()
    
    if not status.available:
        print("Initial connection failed, starting background reconnection...")
        
        # Start background reconnection (attempts every 10 seconds)
        await manager.start_background_reconnection(interval=10)
        
        # Wait for reconnection (or timeout)
        for i in range(12):  # 2 minutes max
            await asyncio.sleep(10)
            
            current_status = manager.get_status()
            if current_status.available:
                print("Reconnection successful!")
                break
            else:
                print(f"Still disconnected... ({(i+1)*10}s elapsed)")
        
        # Stop reconnection attempts
        await manager.stop_background_reconnection()
    
    await manager.disconnect()
```

## API Reference

### ConnectionManager

#### Methods

##### `__init__(config: ComfyUIConfig)`
Initialize ConnectionManager with configuration.

##### `async connect() -> ComfyUIStatus`
Attempt connection to ComfyUI Desktop.

**Returns**: ComfyUIStatus with connection result

**Validates**: Requirements 1.1, 1.2

##### `async disconnect()`
Close connection and cleanup resources.

**Validates**: Requirement 6.5

##### `async check_health() -> ComfyUIStatus`
Check backend health using /system_stats endpoint.

**Returns**: ComfyUIStatus with current health status

**Validates**: Requirements 1.2, 6.1

##### `async start_health_monitoring(interval: int = 5)`
Start periodic health checking.

**Parameters**:
- `interval`: Check interval in seconds (default: 5)

**Validates**: Requirement 6.5

##### `async stop_health_monitoring()`
Stop periodic health checking.

**Validates**: Requirement 6.5

##### `register_status_callback(callback: Callable[[ComfyUIStatus], None])`
Register callback for status changes.

**Parameters**:
- `callback`: Function to call when status changes

**Validates**: Requirement 6.5

##### `unregister_status_callback(callback: Callable[[ComfyUIStatus], None])`
Unregister status callback.

**Parameters**:
- `callback`: Function to remove from callbacks

##### `get_status() -> ComfyUIStatus`
Get current connection status.

**Returns**: Current ComfyUIStatus

**Validates**: Requirement 6.1

##### `async start_background_reconnection(interval: int = 10)`
Start background reconnection attempts.

**Parameters**:
- `interval`: Reconnection attempt interval in seconds

**Validates**: Requirement 11.4

##### `async stop_background_reconnection()`
Stop background reconnection attempts.

**Validates**: Requirement 11.4

##### `should_use_fallback() -> bool`
Check if fallback mode should be used.

**Returns**: True if backend unavailable and fallback should be used

**Validates**: Requirements 1.3, 11.1

##### `get_fallback_mode() -> str`
Get configured fallback mode.

**Returns**: Fallback mode string ("placeholder", "skip", or "abort")

**Validates**: Requirement 11.1

##### `trigger_fallback_warning() -> str`
Generate fallback warning message.

**Returns**: Warning message for user

**Validates**: Requirements 1.3, 11.1

### ComfyUIStatus

Status information for ComfyUI backend.

#### Fields

- `available: bool` - Whether backend is available
- `url: str` - Backend URL
- `version: Optional[str]` - ComfyUI version (if available)
- `queue_size: int` - Current queue size
- `error_message: Optional[str]` - Error message (if unavailable)
- `last_check: datetime` - Timestamp of last check
- `cors_enabled: bool` - Whether CORS is enabled
- `models_ready: bool` - Whether required models are ready
- `workflows_ready: bool` - Whether required workflows are ready

#### Properties

##### `fully_ready -> bool`
Check if backend is fully ready for generation.

**Returns**: True if available, CORS enabled, models ready, and workflows ready

## Examples

See `examples/connection_manager_example.py` for a complete working example.

## Testing

Run tests with:

```bash
python -m pytest tests/test_connection_manager.py -v
```

## Requirements Validation

This implementation validates the following requirements:

- **Requirement 1.1**: Default connection attempt on startup
- **Requirement 1.2**: Connection success display
- **Requirement 1.3**: Connection failure fallback
- **Requirement 6.1**: Connection status display
- **Requirement 6.5**: Periodic status updates
- **Requirement 9.1-9.5**: Configuration management
- **Requirement 11.1**: Automatic fallback activation
- **Requirement 11.4**: Background reconnection attempts

## Integration

The ConnectionManager integrates with:

- **ComfyUIIntegration**: Uses ConnectionManager for backend availability
- **GenerationEngine**: Checks connection status before generation
- **UI Components**: Registers callbacks for status display updates
- **ModelManager**: Coordinates with connection status for downloads
- **WorkflowManager**: Validates workflows when connection available

## Best Practices

1. **Always validate configuration** before creating ConnectionManager
2. **Register status callbacks** for UI updates
3. **Use health monitoring** for long-running applications
4. **Enable background reconnection** when fallback mode is active
5. **Clean up resources** by calling `disconnect()` on shutdown
6. **Handle connection failures gracefully** with appropriate fallback modes
7. **Monitor queue size** to avoid overwhelming the backend

## Troubleshooting

### Connection Timeout

If connections timeout frequently:
- Increase `timeout` in configuration
- Check network connectivity
- Verify ComfyUI Desktop is running
- Check firewall settings

### Health Check Failures

If health checks fail intermittently:
- Increase health check interval
- Check ComfyUI Desktop logs
- Verify system resources (CPU, memory)
- Check for network issues

### Callbacks Not Triggered

If status callbacks aren't called:
- Verify callback is registered before status changes
- Check callback function signature matches expected type
- Look for exceptions in callback execution (logged as errors)

## Future Enhancements

Planned improvements:

- CORS validation integration
- Model readiness checking
- Workflow readiness checking
- Connection metrics and statistics
- Retry with exponential backoff for health checks
- WebSocket support for real-time updates
