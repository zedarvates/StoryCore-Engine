# Error Handling and Resilience System

**Version:** 1.1-production  
**Last Updated:** 2026-01-14

## Overview

The Error Handling and Resilience System provides comprehensive protection against failures in StoryCore-Engine workflows. It implements enterprise-grade resilience patterns to ensure reliable operation even when components fail, networks are unstable, or resources are constrained.

## Philosophy

Our approach to error handling is based on three core principles:

1. **Fail Fast:** Detect failures quickly and respond immediately
2. **Fail Safe:** Provide fallback options to maintain service
3. **Fail Gracefully:** Degrade functionality rather than crash completely

The system is designed to be:
- **Proactive:** Prevent failures before they occur
- **Reactive:** Handle failures when they happen
- **Adaptive:** Learn from failures and adjust behavior
- **Transparent:** Provide visibility into system health

## Key Features

### 1. Automatic Retry Mechanism

Automatically retries failed operations with intelligent backoff strategies.

**Features:**
- Exponential backoff (1s → 2s → 4s → ...)
- Jitter to prevent thundering herd
- Configurable retry policies
- Smart exception detection

**Use Cases:**
- Transient network failures
- Temporary resource unavailability
- Rate limiting responses
- Intermittent service issues

**Example:**
```python
from src.error_handling_resilience import ErrorHandlingSystem

system = ErrorHandlingSystem()

# Automatically retries on failure
result = await system.execute_with_resilience(
    my_function,
    enable_retry=True
)
```

### 2. Circuit Breaker Pattern

Prevents cascade failures by failing fast when a service is down.

**States:**
- **CLOSED:** Normal operation, requests allowed
- **OPEN:** Service failing, requests rejected immediately
- **HALF_OPEN:** Testing recovery, limited requests allowed

**Features:**
- Automatic state transitions
- Configurable thresholds
- Timeout-based recovery
- Per-service isolation

**Use Cases:**
- Protect against downstream failures
- Prevent resource exhaustion
- Enable fast failure detection
- Allow automatic recovery

**Example:**
```python
# Create circuit breaker for a service
circuit_breaker = system.get_circuit_breaker('video_generation')

try:
    result = await circuit_breaker.execute(generate_video)
except CircuitBreakerOpenError:
    # Circuit is open, use fallback
    result = use_cached_video()
```

### 3. Fallback Chains

Provides multiple fallback options when primary operations fail.

**Features:**
- Sequential fallback execution
- Per-fallback configuration
- Automatic fallback selection
- Success/failure tracking

**Use Cases:**
- Quality degradation (high → medium → low)
- Alternative workflows
- Cached responses
- Default values

**Example:**
```python
# Create fallback chain
chain = system.get_fallback_chain('image_generation')

# Add fallbacks in order of preference
chain.add_fallback(generate_high_quality_image)
chain.add_fallback(generate_standard_image)
chain.add_fallback(use_placeholder_image)

# Automatically tries fallbacks on failure
result = await chain.execute(request)
```

### 4. Graceful Degradation

Maintains basic functionality when full service is unavailable.

**Degradation Levels:**
1. **Full** (100%): All features, maximum quality
2. **High** (80%): Most features, high quality
3. **Medium** (60%): Core features, medium quality
4. **Low** (40%): Basic features, low quality
5. **Minimal** (20%): Essential features only

**Features:**
- Automatic parameter adjustment
- Resolution scaling
- Feature disabling
- Quality reduction

**Use Cases:**
- High load situations
- Resource constraints
- Partial system failures
- Performance optimization

**Example:**
```python
degradation = system.graceful_degradation

# Degrade on high error rate
if error_rate > threshold:
    degradation.degrade("High error rate")

# Adjust parameters automatically
params = degradation.adjust_parameters({
    'quality': 1.0,
    'resolution': '1080p',
    'steps': 50
})
# Returns reduced parameters based on degradation level
```

### 5. Error Analytics

Collects and analyzes error data to provide insights.

**Tracked Metrics:**
- Total errors and error rate
- Errors by category (Network, Memory, Model, etc.)
- Errors by severity (Low, Medium, High, Critical)
- Most common error types
- Recovery success rate
- Recent critical errors

**Features:**
- Real-time error tracking
- Historical analysis
- Pattern detection
- Comprehensive reporting

**Use Cases:**
- System health monitoring
- Failure pattern identification
- Performance optimization
- Capacity planning

**Example:**
```python
analytics = system.error_analytics

# Generate comprehensive report
report = analytics.generate_report()

print(f"Total errors: {report['total_errors']}")
print(f"Error rate: {report['error_rate_per_minute']:.2f}/min")
print(f"Recovery rate: {report['recovery_rate']:.1%}")
```

### 6. Recovery Procedures

Automatically attempts to recover from failures.

**Recovery Strategies by Error Category:**

**Network Errors:**
- Retry connection
- Use backup endpoint
- Enable offline mode

**Memory Errors:**
- Clear cache
- Reduce batch size
- Enable memory optimization

**Model Errors:**
- Reload model
- Use fallback model
- Download model

**Workflow Errors:**
- Restart workflow
- Use simpler workflow
- Skip optional steps

**Example:**
```python
# Automatic recovery on error
try:
    result = await system.execute_with_resilience(my_function)
except Exception as e:
    # System automatically attempted recovery
    # Check if recovery was successful
    if system.error_analytics.get_recovery_rate() > 0.8:
        print("Recovery successful")
```

### 7. System Health Monitoring

Provides real-time visibility into system health.

**Health Metrics:**
- Current degradation level
- Error rate (errors per minute)
- Recovery rate (% successful)
- Circuit breaker states
- Retry statistics
- Fallback statistics

**Example:**
```python
# Get system health
health = system.get_system_health()

print(f"Degradation: {health['degradation_level']}")
print(f"Error rate: {health['error_rate']:.2f}/min")
print(f"Recovery rate: {health['recovery_rate']:.1%}")

# Check circuit breakers
for name, state in health['circuit_breakers'].items():
    print(f"{name}: {state['state']}")
```

## Quick Start

### Basic Usage

```python
from src.error_handling_resilience import ErrorHandlingSystem

# Initialize system
system = ErrorHandlingSystem()

# Execute with automatic resilience
async def my_workflow():
    # Your workflow logic
    return await generate_content()

# Execute with retry and circuit breaker
result = await system.execute_with_resilience(
    my_workflow,
    circuit_breaker_name='my_service',
    enable_retry=True
)
```

### With Fallback Chain

```python
# Create fallback chain
chain = system.get_fallback_chain('content_generation')

# Add fallbacks
chain.add_fallback(generate_premium_content)
chain.add_fallback(generate_standard_content)
chain.add_fallback(generate_basic_content)

# Execute with automatic fallback
result = await chain.execute(request)
```

### With Graceful Degradation

```python
# Monitor and degrade automatically
degradation = system.graceful_degradation

# Adjust parameters based on system load
params = {
    'quality': 1.0,
    'resolution': '1080p',
    'steps': 50
}

# Get adjusted parameters
adjusted = degradation.adjust_parameters(params)

# Use adjusted parameters
result = await generate_content(**adjusted)
```

## Resilience Patterns

### Pattern 1: Retry with Exponential Backoff

**When to use:** Transient failures (network, rate limiting)

**Configuration:**
```python
from src.error_handling_resilience import RetryConfig

config = RetryConfig(
    max_attempts=3,
    initial_delay=1.0,
    max_delay=60.0,
    exponential_base=2.0,
    jitter=True
)

system.retry_mechanism = RetryMechanism(config)
```

### Pattern 2: Circuit Breaker

**When to use:** Protect against downstream failures

**Configuration:**
```python
from src.error_handling_resilience import CircuitBreakerConfig

config = CircuitBreakerConfig(
    failure_threshold=5,
    success_threshold=2,
    timeout=60.0,
    half_open_max_calls=1
)

circuit_breaker = CircuitBreaker('my_service', config)
```

### Pattern 3: Fallback Chain

**When to use:** Multiple alternative approaches available

**Setup:**
```python
chain = system.get_fallback_chain('my_workflow')
chain.add_fallback(primary_approach)
chain.add_fallback(secondary_approach)
chain.add_fallback(tertiary_approach)
```

### Pattern 4: Graceful Degradation

**When to use:** Maintain service under constraints

**Usage:**
```python
# Degrade on high load
if system_load > 0.8:
    system.graceful_degradation.degrade("High load")

# Restore when load decreases
if system_load < 0.5:
    system.graceful_degradation.restore()
```

## Performance Impact

### Overhead

| Feature | Overhead | Impact |
|---------|----------|--------|
| Retry Mechanism | < 1ms | Negligible |
| Circuit Breaker | < 0.1ms | Negligible |
| Fallback Chain | < 1ms per fallback | Low |
| Error Analytics | < 0.5ms | Negligible |
| System Health Check | < 5ms | Low |

### Memory Usage

| Component | Memory | Notes |
|-----------|--------|-------|
| Base System | ~8MB | One-time |
| Circuit Breaker | ~100KB each | Per service |
| Fallback Chain | ~50KB each | Per workflow |
| Error History | ~2MB | 1000 entries |
| **Total Typical** | **~15MB** | For 10 services |

### Scalability

- Supports 100+ circuit breakers
- Supports 50+ fallback chains
- Handles 1000+ errors/minute
- Minimal performance degradation

## Best Practices

### 1. Use Circuit Breakers for External Services

```python
# ✓ Good: Protect external API calls
circuit_breaker = system.get_circuit_breaker('external_api')
result = await circuit_breaker.execute(call_external_api)

# ✗ Bad: No protection
result = await call_external_api()
```

### 2. Configure Appropriate Retry Policies

```python
# ✓ Good: Retry transient errors only
config = RetryConfig(
    max_attempts=3,
    retryable_exceptions={ConnectionError, TimeoutError}
)

# ✗ Bad: Retry all errors
config = RetryConfig(
    max_attempts=10,
    retryable_exceptions={Exception}  # Too broad!
)
```

### 3. Provide Meaningful Fallbacks

```python
# ✓ Good: Useful fallbacks
chain.add_fallback(generate_high_quality)
chain.add_fallback(generate_standard_quality)
chain.add_fallback(use_cached_result)

# ✗ Bad: No real fallback
chain.add_fallback(primary_function)
chain.add_fallback(lambda: None)  # Not helpful!
```

### 4. Monitor System Health

```python
# ✓ Good: Regular health checks
health = system.get_system_health()
if health['error_rate'] > 10:
    alert_operations_team()

# ✗ Bad: No monitoring
# Just hope everything works
```

### 5. Handle Circuit Breaker Open State

```python
# ✓ Good: Provide fallback when circuit is open
try:
    result = await circuit_breaker.execute(my_function)
except CircuitBreakerOpenError:
    result = use_fallback()

# ✗ Bad: Let exception propagate
result = await circuit_breaker.execute(my_function)
```

## Common Use Cases

### Use Case 1: Video Generation with Resilience

```python
# Set up resilience for video generation
circuit_breaker = system.get_circuit_breaker('video_generation')
fallback_chain = system.get_fallback_chain('video_quality')

fallback_chain.add_fallback(generate_1080p_video)
fallback_chain.add_fallback(generate_720p_video)
fallback_chain.add_fallback(generate_480p_video)

# Execute with full resilience
result = await system.execute_with_resilience(
    fallback_chain.execute,
    request,
    circuit_breaker_name='video_generation',
    enable_retry=True
)
```

### Use Case 2: Model Loading with Retry

```python
# Retry model loading on failure
result = await system.execute_with_resilience(
    load_model,
    model_path,
    enable_retry=True
)
```

### Use Case 3: API Calls with Circuit Breaker

```python
# Protect API calls with circuit breaker
circuit_breaker = system.get_circuit_breaker('external_api')

try:
    result = await circuit_breaker.execute(call_api, endpoint)
except CircuitBreakerOpenError:
    # Use cached data when circuit is open
    result = get_cached_data(endpoint)
```

## Integration

The Error Handling System integrates seamlessly with:

- **Video Engines:** HunyuanVideo, Wan ATI
- **Image Engines:** Qwen, Flux, Newbie
- **Model Manager:** AdvancedModelManager
- **Workflow System:** IntegratedWorkflowSystem
- **Security System:** SecurityValidationSystem
- **Monitoring:** MonitoringDashboard

See the [Error Handling Integration Guide](advanced-workflows/error-handling-guide.md) for detailed integration examples.

## Documentation

- **Implementation Guide:** [error-handling-guide.md](advanced-workflows/error-handling-guide.md)
- **API Reference:** [error-handling-api.md](api/error-handling-api.md)
- **Integration Examples:** [Integration Guide](INTEGRATION_GUIDE.md)

## Support

For issues or questions:
1. Check the [Troubleshooting Guide](advanced-workflows/error-handling-guide.md#troubleshooting)
2. Review [API Documentation](api/error-handling-api.md)
3. See [Integration Examples](INTEGRATION_GUIDE.md)
4. Report issues with detailed error information

---

**The Error Handling and Resilience System ensures StoryCore-Engine workflows remain reliable and responsive even when failures occur.**
