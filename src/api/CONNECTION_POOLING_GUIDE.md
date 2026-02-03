# Connection Pooling Guide

## Overview

The StoryCore API system includes a comprehensive connection pooling infrastructure for managing connections to backend services (ComfyUI, LLM services, etc.). Connection pooling improves performance by reusing connections, managing connection lifecycle, and handling failures gracefully.

## Features

- **Generic Connection Pool**: Reusable pool implementation for any backend service
- **Health Checking**: Automatic health checks and reconnection
- **Connection Lifecycle**: Automatic timeout and idle connection management
- **Thread-Safe**: Safe for concurrent access from multiple threads
- **Statistics**: Comprehensive metrics and monitoring
- **Multiple Backends**: Support for ComfyUI, LLM services, and custom backends

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│           ConnectionPoolManager                         │
│  - Manages multiple named pools                         │
│  - Global singleton instance                            │
└─────────────────┬───────────────────────────────────────┘
                  │
        ┌─────────┴─────────┬─────────────────┐
        │                   │                 │
┌───────▼────────┐  ┌───────▼────────┐  ┌────▼──────────┐
│ ComfyUI Pool   │  │   LLM Pool     │  │ Custom Pool   │
│ - Min: 1       │  │ - Min: 1       │  │ - Min: N      │
│ - Max: 5       │  │ - Max: 10      │  │ - Max: M      │
└───────┬────────┘  └───────┬────────┘  └────┬──────────┘
        │                   │                 │
        │ Pooled Connections with metadata    │
        │ - State tracking                    │
        │ - Health monitoring                 │
        │ - Usage statistics                  │
        └─────────────────────────────────────┘
```

## Quick Start

### 1. ComfyUI Connection Pool

```python
from src.api.services.comfyui_connection import (
    create_comfyui_pool,
    get_comfyui_pool,
    ComfyUIConfig
)

# Create pool
config = ComfyUIConfig(
    host="localhost",
    port=8188,
    timeout=30.0
)

pool = create_comfyui_pool(
    name="comfyui",
    comfyui_config=config,
    min_connections=1,
    max_connections=5
)

# Use connection from pool
with pool.get_connection() as conn:
    result = conn.execute("queue_prompt", workflow=my_workflow)
    print(result)

# Get pool statistics
stats = pool.get_stats()
print(f"Total requests: {stats.total_requests}")
print(f"Active connections: {stats.active_connections}")
```

### 2. LLM Connection Pool

```python
from src.api.services.llm_connection import (
    create_llm_pool,
    get_llm_pool,
    LLMConfig,
    LLMProvider
)

# Create pool
config = LLMConfig(
    provider=LLMProvider.OPENAI,
    api_key="your-api-key",
    model="gpt-4",
    timeout=60.0
)

pool = create_llm_pool(
    name="llm",
    llm_config=config,
    min_connections=1,
    max_connections=10
)

# Use connection from pool
with pool.get_connection() as conn:
    result = conn.execute("complete", prompt="Generate a story about...")
    print(result)

# Chat completion
with pool.get_connection() as conn:
    messages = [
        {"role": "user", "content": "Hello!"}
    ]
    result = conn.execute("chat", messages=messages)
    print(result)
```

### 3. Custom Connection Pool

```python
from src.api.services.connection_pool import (
    Connection,
    ConnectionConfig,
    ConnectionPool,
    BackendType
)

# Implement custom connection
class MyCustomConnection(Connection):
    def connect(self):
        # Establish connection
        pass
    
    def disconnect(self):
        # Close connection
        pass
    
    def is_healthy(self):
        # Check health
        return True
    
    def execute(self, operation, **kwargs):
        # Execute operation
        return {"result": "success"}

# Create pool
config = ConnectionConfig(
    backend_type=BackendType.CUSTOM,
    host="localhost",
    port=9000,
    min_connections=2,
    max_connections=10
)

def factory():
    return MyCustomConnection()

pool = ConnectionPool(config, factory)

# Use connection
with pool.get_connection() as conn:
    result = conn.execute("my_operation", param1="value1")
```

## Configuration

### ConnectionConfig Parameters

```python
@dataclass
class ConnectionConfig:
    backend_type: BackendType          # Type of backend service
    host: str                          # Host address
    port: int                          # Port number
    min_connections: int = 1           # Minimum connections to maintain
    max_connections: int = 10          # Maximum connections allowed
    connection_timeout: float = 30.0   # Connection timeout (seconds)
    idle_timeout: float = 300.0        # Idle timeout (seconds)
    max_retries: int = 3               # Max connection retry attempts
    retry_delay: float = 1.0           # Delay between retries (seconds)
    health_check_interval: float = 60.0 # Health check interval (seconds)
    enable_health_check: bool = True   # Enable background health checks
    custom_params: Dict[str, Any] = {} # Custom parameters
```

### ComfyUIConfig Parameters

```python
@dataclass
class ComfyUIConfig:
    host: str = "localhost"            # ComfyUI host
    port: int = 8188                   # ComfyUI port
    api_path: str = "/api"             # API path
    timeout: float = 30.0              # Request timeout
    verify_ssl: bool = True            # Verify SSL certificates
```

### LLMConfig Parameters

```python
@dataclass
class LLMConfig:
    provider: LLMProvider = LLMProvider.OPENAI  # LLM provider
    api_key: Optional[str] = None               # API key
    base_url: Optional[str] = None              # Custom base URL
    model: str = "gpt-4"                        # Model name
    timeout: float = 60.0                       # Request timeout
    max_tokens: int = 2000                      # Max tokens
    temperature: float = 0.7                    # Temperature
```

## Connection Pool Manager

The `ConnectionPoolManager` manages multiple named connection pools:

```python
from src.api.services.connection_pool import get_pool_manager

# Get global manager
manager = get_pool_manager()

# Create multiple pools
manager.create_pool("comfyui-1", config1, factory1)
manager.create_pool("comfyui-2", config2, factory2)
manager.create_pool("llm", config3, factory3)

# Get specific pool
pool = manager.get_pool("comfyui-1")

# Get all statistics
all_stats = manager.get_all_stats()
for name, stats in all_stats.items():
    print(f"{name}: {stats.total_requests} requests")

# Remove pool
manager.remove_pool("comfyui-2")

# Shutdown all pools
manager.shutdown_all()
```

## Statistics and Monitoring

### Available Statistics

```python
@dataclass
class ConnectionStats:
    total_connections: int          # Total connections in pool
    active_connections: int         # Currently active connections
    idle_connections: int           # Currently idle connections
    failed_connections: int         # Failed connection attempts
    total_requests: int             # Total requests processed
    successful_requests: int        # Successful requests
    failed_requests: int            # Failed requests
    average_wait_time: float        # Average wait time for connection
    peak_connections: int           # Peak connection count
    last_reset: datetime            # Last stats reset time
```

### Monitoring Example

```python
# Get statistics
stats = pool.get_stats()

print(f"Pool Health:")
print(f"  Total Connections: {stats.total_connections}")
print(f"  Active: {stats.active_connections}")
print(f"  Idle: {stats.idle_connections}")
print(f"  Peak: {stats.peak_connections}")
print(f"\nPerformance:")
print(f"  Total Requests: {stats.total_requests}")
print(f"  Success Rate: {stats.successful_requests / stats.total_requests * 100:.1f}%")
print(f"  Avg Wait Time: {stats.average_wait_time * 1000:.1f}ms")

# Reset statistics
pool.reset_stats()
```

## Best Practices

### 1. Pool Sizing

```python
# For ComfyUI (typically single instance)
comfyui_pool = create_comfyui_pool(
    min_connections=1,    # Keep one connection warm
    max_connections=5     # Limit concurrent workflows
)

# For LLM services (can handle more concurrency)
llm_pool = create_llm_pool(
    min_connections=2,    # Keep connections warm
    max_connections=10    # Allow more concurrent requests
)
```

### 2. Error Handling

```python
from src.api.services.connection_pool import ConnectionPool

try:
    with pool.get_connection(timeout=10.0) as conn:
        result = conn.execute("operation")
except TimeoutError:
    # Pool exhausted or connection timeout
    print("Connection pool exhausted")
except Exception as e:
    # Operation failed
    print(f"Operation failed: {e}")
```

### 3. Connection Lifecycle

```python
# Connections are automatically managed:
# - Created on demand up to max_connections
# - Health checked periodically
# - Closed when idle too long
# - Removed when unhealthy

# Manual shutdown when done
pool.shutdown()
```

### 4. Concurrent Access

```python
import threading

def worker():
    with pool.get_connection() as conn:
        result = conn.execute("operation")
        # Process result

# Safe for concurrent access
threads = [threading.Thread(target=worker) for _ in range(10)]
for t in threads:
    t.start()
for t in threads:
    t.join()
```

## Performance Optimization

### 1. Pre-warm Connections

```python
# Set min_connections to pre-create connections
config = ConnectionConfig(
    min_connections=3,  # Pre-create 3 connections
    max_connections=10
)
```

### 2. Adjust Timeouts

```python
# For fast operations
config = ConnectionConfig(
    connection_timeout=5.0,   # Quick timeout
    idle_timeout=60.0         # Close idle connections quickly
)

# For slow operations
config = ConnectionConfig(
    connection_timeout=120.0,  # Longer timeout
    idle_timeout=600.0         # Keep connections longer
)
```

### 3. Health Check Tuning

```python
# Frequent health checks (more overhead, faster detection)
config = ConnectionConfig(
    health_check_interval=30.0,  # Check every 30 seconds
    enable_health_check=True
)

# Infrequent health checks (less overhead, slower detection)
config = ConnectionConfig(
    health_check_interval=300.0,  # Check every 5 minutes
    enable_health_check=True
)

# Disable health checks (no overhead, manual management)
config = ConnectionConfig(
    enable_health_check=False
)
```

## Troubleshooting

### Connection Pool Exhausted

**Symptom**: `TimeoutError: Connection pool exhausted`

**Solutions**:
1. Increase `max_connections`
2. Reduce operation duration
3. Check for connection leaks (not releasing connections)
4. Monitor with statistics

```python
# Check if connections are being released
stats = pool.get_stats()
if stats.active_connections == config.max_connections:
    print("All connections active - may need more capacity")
```

### Unhealthy Connections

**Symptom**: Connections marked as unhealthy and removed

**Solutions**:
1. Check backend service health
2. Adjust health check interval
3. Implement custom health check logic

```python
# Custom health check
class MyConnection(Connection):
    def is_healthy(self):
        try:
            # Custom health check logic
            response = self.ping()
            return response.status == "ok"
        except:
            return False
```

### High Wait Times

**Symptom**: High `average_wait_time` in statistics

**Solutions**:
1. Increase `max_connections`
2. Optimize operation duration
3. Add more backend instances

```python
# Monitor wait times
stats = pool.get_stats()
if stats.average_wait_time > 1.0:  # > 1 second
    print(f"High wait time: {stats.average_wait_time:.2f}s")
    print("Consider increasing max_connections")
```

## Integration with API Layer

### Using Pools in Category Handlers

```python
from src.api.base_handler import BaseCategoryHandler
from src.api.services.comfyui_connection import get_comfyui_pool

class ImageCategoryHandler(BaseCategoryHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.comfyui_pool = get_comfyui_pool()
    
    def generate_image(self, params, context):
        # Use connection from pool
        with self.comfyui_pool.get_connection() as conn:
            result = conn.execute("queue_prompt", workflow=params["workflow"])
            return result
```

### Initialization in API System

```python
from src.api.services.comfyui_connection import create_comfyui_pool
from src.api.services.llm_connection import create_llm_pool

def initialize_api_system():
    # Create connection pools
    comfyui_pool = create_comfyui_pool(
        name="comfyui",
        min_connections=1,
        max_connections=5
    )
    
    llm_pool = create_llm_pool(
        name="llm",
        min_connections=2,
        max_connections=10
    )
    
    # Pools are now available globally
    return {
        "comfyui": comfyui_pool,
        "llm": llm_pool
    }

def shutdown_api_system():
    # Shutdown all pools
    from src.api.services.connection_pool import get_pool_manager
    manager = get_pool_manager()
    manager.shutdown_all()
```

## Conclusion

The connection pooling system provides:
- ✅ Improved performance through connection reuse
- ✅ Automatic connection lifecycle management
- ✅ Health monitoring and recovery
- ✅ Thread-safe concurrent access
- ✅ Comprehensive statistics and monitoring
- ✅ Support for multiple backend types

For more information, see:
- `src/api/services/connection_pool.py` - Core pool implementation
- `src/api/services/comfyui_connection.py` - ComfyUI integration
- `src/api/services/llm_connection.py` - LLM integration
- `tests/unit/test_connection_pool.py` - Unit tests
- `tests/integration/test_connection_pool_integration.py` - Integration tests
