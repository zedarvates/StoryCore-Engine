# Error Handling Implementation Guide

**Version:** 1.0-draft  
**Last Updated:** 2026-01-18  
**Related Documents:**
- [Error Handling Overview](../ERROR_HANDLING.md)
- [API Reference](../api/error-handling-api.md)
- [Integration Guide](../INTEGRATION_GUIDE.md)

## Table of Contents

- [Overview](#overview)
- [Retry Mechanisms](#retry-mechanisms)
  - [How Retry Works](#how-retry-works)
  - [Configuration Options](#configuration-options)
  - [Code Examples](#code-examples)
- [Circuit Breakers](#circuit-breakers)
  - [Circuit Breaker Patterns](#circuit-breaker-patterns)
  - [Implementation Details](#implementation-details)
  - [Threshold Configuration](#threshold-configuration)
  - [Usage Examples](#usage-examples)
- [Fallback Chains](#fallback-chains)
  - [Design Principles](#design-principles)
  - [Usage Patterns](#usage-patterns)
  - [Implementation Examples](#implementation-examples)
- [Degradation Levels](#degradation-levels)
  - [Graceful Degradation Strategies](#graceful-degradation-strategies)
  - [Level Definitions](#level-definitions)
  - [Configuration and Monitoring](#configuration-and-monitoring)
- [Integration Examples](#integration-examples)
  - [Video Engine Integration](#video-engine-integration)
  - [Image Engine Integration](#image-engine-integration)
  - [Workflow System Integration](#workflow-system-integration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

This guide provides detailed implementation instructions for the Error Handling and Resilience System in StoryCore-Engine. It builds upon the [Error Handling Overview](../ERROR_HANDLING.md), offering practical examples and configuration details for each resilience pattern.

The system ensures workflows remain operational under various failure conditions through proactive detection, reactive recovery, and adaptive behavior. All patterns work together to provide enterprise-grade reliability.

## Retry Mechanisms

### How Retry Works

The retry mechanism automatically re-attempts failed operations using exponential backoff with jitter to prevent cascading failures. It distinguishes between retryable and non-retryable errors to avoid wasting resources on permanent failures.

**Key Components:**
- **Exponential Backoff:** Delays increase exponentially (1s, 2s, 4s, etc.)
- **Jitter:** Random variation prevents synchronized retries
- **Smart Detection:** Only retries transient failures (network, timeout, rate limits)
- **Configurable Limits:** Maximum attempts and delay caps

**Algorithm:**
1. Execute operation
2. On failure, check if error is retryable
3. If retryable and attempts remaining:
   - Calculate delay: `delay = base_delay * (exponential_base ^ attempt) + jitter`
   - Wait for delay
   - Retry operation
4. If not retryable or max attempts reached, raise exception

### Configuration Options

```python
from src.error_handling_resilience import RetryConfig

# Basic configuration
retry_config = RetryConfig(
    max_attempts=3,                    # Maximum retry attempts
    initial_delay=1.0,                 # Initial delay in seconds
    max_delay=60.0,                    # Maximum delay cap
    exponential_base=2.0,             # Backoff multiplier
    jitter=True,                       # Add random jitter
    retryable_exceptions={             # Exceptions to retry
        ConnectionError,
        TimeoutError,
        OSError
    }
)

# Advanced configuration for high-throughput systems
high_throughput_config = RetryConfig(
    max_attempts=5,
    initial_delay=0.5,
    max_delay=30.0,
    exponential_base=1.5,
    jitter=True,
    retryable_exceptions={
        ConnectionError,
        TimeoutError,
        requests.exceptions.RequestException
    }
)
```

### Code Examples

#### Basic Retry Usage

```python
from src.error_handling_resilience import ErrorHandlingSystem

system = ErrorHandlingSystem()

async def unreliable_operation():
    # Operation that may fail
    return await call_external_api()

# Execute with automatic retry
result = await system.execute_with_resilience(
    unreliable_operation,
    enable_retry=True
)
```

#### Custom Retry Configuration

```python
# Configure retry for specific operation
retry_config = RetryConfig(
    max_attempts=3,
    initial_delay=2.0,
    retryable_exceptions={ValueError, KeyError}
)

result = await system.execute_with_resilience(
    my_operation,
    retry_config=retry_config
)
```

#### Retry with Custom Logic

```python
from src.error_handling_resilience import RetryMechanism

retry_mechanism = RetryMechanism(retry_config)

async def custom_retry_operation():
    return await retry_mechanism.execute_async(
        lambda: potentially_failing_function(),
        context="custom_operation"
    )
```

## Circuit Breakers

### Circuit Breaker Patterns

Circuit breakers prevent cascade failures by failing fast when a service is consistently failing. They implement the classic circuit breaker pattern with three states:

- **CLOSED:** Normal operation, all requests pass through
- **OPEN:** Service is failing, requests fail immediately without execution
- **HALF_OPEN:** Testing recovery, limited requests allowed to check if service is healthy

**State Transitions:**
- CLOSED → OPEN: When failure count exceeds threshold
- OPEN → HALF_OPEN: After timeout period
- HALF_OPEN → CLOSED: When success threshold met
- HALF_OPEN → OPEN: When failure occurs in half-open state

### Implementation Details

The circuit breaker tracks success/failure metrics per operation and automatically manages state transitions. Each circuit breaker is isolated per service to prevent one failing service from affecting others.

**Implementation:**
```python
class CircuitBreaker:
    def __init__(self, name: str, config: CircuitBreakerConfig):
        self.name = name
        self.config = config
        self.state = CircuitBreakerState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = None

    async def execute(self, func: Callable, *args, **kwargs):
        if self.state == CircuitBreakerState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitBreakerState.HALF_OPEN
            else:
                raise CircuitBreakerOpenError(f"Circuit breaker {self.name} is OPEN")

        try:
            result = await func(*args, **kwargs)
            self._record_success()
            return result
        except Exception as e:
            self._record_failure()
            raise e
```

### Threshold Configuration

```python
from src.error_handling_resilience import CircuitBreakerConfig

# Standard configuration
circuit_config = CircuitBreakerConfig(
    failure_threshold=5,              # Failures to trigger OPEN
    success_threshold=2,              # Successes to return to CLOSED
    timeout=60.0,                     # Seconds before attempting reset
    half_open_max_calls=3,            # Max calls in HALF_OPEN state
    expected_exception=Exception,     # Exception type to count as failure
    time_window=300.0                 # Rolling window for failure count (seconds)
)

# Aggressive configuration for critical services
critical_config = CircuitBreakerConfig(
    failure_threshold=3,
    success_threshold=1,
    timeout=30.0,
    half_open_max_calls=1
)

# Lenient configuration for unstable services
lenient_config = CircuitBreakerConfig(
    failure_threshold=10,
    success_threshold=5,
    timeout=120.0,
    half_open_max_calls=5
)
```

### Usage Examples

#### Basic Circuit Breaker Usage

```python
from src.error_handling_resilience import ErrorHandlingSystem

system = ErrorHandlingSystem()

# Get or create circuit breaker
circuit_breaker = system.get_circuit_breaker(
    'external_api',
    config=circuit_config
)

async def call_api():
    return await requests.get('https://api.example.com/data')

try:
    result = await circuit_breaker.execute(call_api)
except CircuitBreakerOpenError:
    # Circuit is open, use fallback
    result = get_cached_data()
```

#### Circuit Breaker with Custom Fallback

```python
# Define fallback strategy
async def api_call_with_fallback():
    try:
        return await circuit_breaker.execute(call_api)
    except CircuitBreakerOpenError:
        # Log circuit breaker state
        logger.warning(f"Circuit breaker 'external_api' is OPEN")
        # Use alternative approach
        return await call_backup_api()

result = await api_call_with_fallback()
```

#### Monitoring Circuit Breaker State

```python
# Check circuit breaker health
health = system.get_system_health()

for name, cb_info in health['circuit_breakers'].items():
    print(f"{name}: {cb_info['state']} "
          f"(failures: {cb_info['failure_count']}, "
          f"last_failure: {cb_info['last_failure_time']})")
```

## Fallback Chains

### Design Principles

Fallback chains provide multiple execution paths when primary operations fail. They execute alternatives in order of preference, tracking success rates to optimize future selections.

**Key Principles:**
- **Sequential Execution:** Try alternatives in defined order
- **Success Tracking:** Learn which fallbacks work best
- **Per-Operation Isolation:** Different chains for different operations
- **Configurable Behavior:** Customize execution and selection logic

**Execution Flow:**
1. Execute primary operation
2. On failure, try first fallback
3. Continue through fallbacks until success or exhaustion
4. Record outcome for analytics

### Usage Patterns

```python
from src.error_handling_resilience import ErrorHandlingSystem

system = ErrorHandlingSystem()

# Create fallback chain
chain = system.get_fallback_chain('content_generation')

# Add fallbacks in order of preference (highest quality first)
chain.add_fallback(
    generate_premium_content,
    name='premium',
    expected_quality=1.0
)

chain.add_fallback(
    generate_standard_content,
    name='standard',
    expected_quality=0.8
)

chain.add_fallback(
    generate_basic_content,
    name='basic',
    expected_quality=0.6
)

chain.add_fallback(
    use_cached_content,
    name='cached',
    expected_quality=0.4
)
```

### Implementation Examples

#### Basic Fallback Chain

```python
# Execute with automatic fallback
request = ContentRequest(quality='high', topic='story')

try:
    result = await chain.execute(request)
    print(f"Generated content with quality: {result.quality}")
except Exception as e:
    print(f"All fallbacks failed: {e}")
    # Use default content
    result = get_default_content()
```

#### Dynamic Fallback Selection

```python
# Chain with conditional fallbacks
chain = system.get_fallback_chain('video_generation')

# Add conditional fallback based on system load
async def generate_adaptive_quality(request):
    load = get_system_load()
    if load < 0.7:
        return await generate_high_quality_video(request)
    else:
        return await generate_medium_quality_video(request)

chain.add_fallback(generate_adaptive_quality, name='adaptive')
chain.add_fallback(generate_low_quality_video, name='low_quality')
```

#### Fallback Chain with Metrics

```python
# Execute and track performance
start_time = time.time()
result = await chain.execute(request)
execution_time = time.time() - start_time

# Get chain statistics
stats = chain.get_statistics()
print(f"Execution time: {execution_time:.2f}s")
print(f"Successful fallback: {stats['last_successful_fallback']}")
print(f"Success rate: {stats['overall_success_rate']:.1%}")
```

## Degradation Levels

### Graceful Degradation Strategies

Graceful degradation maintains service availability by reducing functionality under stress. The system automatically adjusts parameters based on current conditions, ensuring critical operations continue.

**Strategies:**
- **Parameter Adjustment:** Reduce quality, resolution, steps
- **Feature Disabling:** Skip non-essential features
- **Resource Optimization:** Use less memory/CPU intensive methods
- **Caching Increase:** Rely more on cached results

### Level Definitions

The system uses five degradation levels with specific parameter adjustments:

| Level | Percentage | Description | Quality Impact |
|-------|------------|-------------|----------------|
| Full | 100% | All features, maximum quality | None |
| High | 80% | Most features, high quality | Minor reduction |
| Medium | 60% | Core features, medium quality | Moderate reduction |
| Low | 40% | Basic features, low quality | Significant reduction |
| Minimal | 20% | Essential features only | Major reduction |

**Parameter Adjustments by Level:**

```python
DEGRADATION_LEVELS = {
    'full': {
        'quality_multiplier': 1.0,
        'resolution_scale': 1.0,
        'max_steps': None,  # Use original
        'features_enabled': ['all']
    },
    'high': {
        'quality_multiplier': 0.9,
        'resolution_scale': 0.95,
        'max_steps': None,
        'features_enabled': ['core', 'enhancements']
    },
    'medium': {
        'quality_multiplier': 0.8,
        'resolution_scale': 0.9,
        'max_steps': 30,
        'features_enabled': ['core']
    },
    'low': {
        'quality_multiplier': 0.6,
        'resolution_scale': 0.8,
        'max_steps': 20,
        'features_enabled': ['basic']
    },
    'minimal': {
        'quality_multiplier': 0.4,
        'resolution_scale': 0.7,
        'max_steps': 10,
        'features_enabled': ['essential']
    }
}
```

### Configuration and Monitoring

```python
from src.error_handling_resilience import GracefulDegradation

degradation = system.graceful_degradation

# Configure degradation triggers
degradation.configure_triggers({
    'error_rate_threshold': 0.1,      # 10% error rate
    'memory_usage_threshold': 0.9,    # 90% memory usage
    'cpu_usage_threshold': 0.95,      # 95% CPU usage
    'response_time_threshold': 30.0   # 30 second response time
})

# Manual degradation
degradation.degrade("High system load detected")

# Check current level
current_level = degradation.get_current_level()
print(f"Current degradation level: {current_level['name']} "
      f"({current_level['percentage']}%)")

# Restore when conditions improve
if system_load < 0.5:
    degradation.restore()

# Adjust parameters automatically
original_params = {
    'quality': 1.0,
    'resolution': '1080p',
    'steps': 50,
    'model': 'premium'
}

adjusted_params = degradation.adjust_parameters(original_params)
# Returns: {'quality': 0.8, 'resolution': '720p', 'steps': 30, 'model': 'standard'}
```

## Integration Examples

### Video Engine Integration

```python
from src.error_handling_resilience import ErrorHandlingSystem
from src.video_engines import HunyuanVideoEngine, WanVideoEngine

system = ErrorHandlingSystem()

class ResilientVideoEngine:
    def __init__(self):
        self.hunyuan = HunyuanVideoEngine()
        self.wan = WanVideoEngine()

        # Configure circuit breakers
        self.hunyuan_cb = system.get_circuit_breaker('hunyuan_video')
        self.wan_cb = system.get_circuit_breaker('wan_video')

        # Configure fallback chain
        self.fallback_chain = system.get_fallback_chain('video_generation')
        self.fallback_chain.add_fallback(
            self._generate_hunyuan,
            name='hunyuan_premium'
        )
        self.fallback_chain.add_fallback(
            self._generate_wan,
            name='wan_standard'
        )
        self.fallback_chain.add_fallback(
            self._generate_cached,
            name='cached_fallback'
        )

    async def _generate_hunyuan(self, request):
        return await self.hunyuan_cb.execute(
            self.hunyuan.generate,
            request
        )

    async def _generate_wan(self, request):
        return await self.wan_cb.execute(
            self.wan.generate,
            request
        )

    async def _generate_cached(self, request):
        # Return cached or placeholder video
        return await get_cached_video(request)

    async def generate_video(self, request):
        # Apply degradation adjustments
        adjusted_request = system.graceful_degradation.adjust_parameters(request)

        # Execute with full resilience
        return await system.execute_with_resilience(
            self.fallback_chain.execute,
            adjusted_request,
            circuit_breaker_name='video_generation',
            enable_retry=True
        )

# Usage
engine = ResilientVideoEngine()
video = await engine.generate_video({
    'prompt': 'A story scene',
    'duration': 10,
    'quality': 'high'
})
```

### Image Engine Integration

```python
from src.error_handling_resilience import ErrorHandlingSystem
from src.image_engines import QwenImageEngine, FluxImageEngine, NewbieImageEngine

system = ErrorHandlingSystem()

class ResilientImageEngine:
    def __init__(self):
        self.qwen = QwenImageEngine()
        self.flux = FluxImageEngine()
        self.newbie = NewbieImageEngine()

        # Circuit breakers for each engine
        self.qwen_cb = system.get_circuit_breaker('qwen_image')
        self.flux_cb = system.get_circuit_breaker('flux_image')
        self.newbie_cb = system.get_circuit_breaker('newbie_image')

        # Quality-based fallback chain
        self.quality_chain = system.get_fallback_chain('image_quality')
        self.quality_chain.add_fallback(
            self._generate_qwen,
            name='qwen_ultra'
        )
        self.quality_chain.add_fallback(
            self._generate_flux,
            name='flux_high'
        )
        self.quality_chain.add_fallback(
            self._generate_newbie,
            name='newbie_standard'
        )

    async def _generate_qwen(self, request):
        return await self.qwen_cb.execute(
            self.qwen.generate,
            request
        )

    async def _generate_flux(self, request):
        return await self.flux_cb.execute(
            self.flux.generate,
            request
        )

    async def _generate_newbie(self, request):
        return await self.newbie_cb.execute(
            self.newbie.generate,
            request
        )

    async def generate_image(self, request):
        adjusted_request = system.graceful_degradation.adjust_parameters(request)

        return await system.execute_with_resilience(
            self.quality_chain.execute,
            adjusted_request,
            enable_retry=True
        )

# Usage
engine = ResilientImageEngine()
image = await engine.generate_image({
    'prompt': 'A beautiful landscape',
    'style': 'realistic',
    'size': '1024x1024'
})
```

### Workflow System Integration

```python
from src.error_handling_resilience import ErrorHandlingSystem
from src.workflow_system import IntegratedWorkflowSystem

system = ErrorHandlingSystem()

class ResilientWorkflowSystem:
    def __init__(self, workflow_system: IntegratedWorkflowSystem):
        self.workflow_system = workflow_system

        # Circuit breaker for workflow execution
        self.workflow_cb = system.get_circuit_breaker('workflow_execution')

        # Fallback chains for different workflow components
        self.generation_chain = system.get_fallback_chain('content_generation')
        self.processing_chain = system.get_fallback_chain('content_processing')
        self.output_chain = system.get_fallback_chain('output_generation')

    async def execute_workflow(self, workflow_config):
        # Adjust workflow based on degradation level
        adjusted_config = system.graceful_degradation.adjust_parameters(workflow_config)

        async def execute_with_resilience():
            # Generation phase with fallback
            content = await self.generation_chain.execute(adjusted_config['generation'])

            # Processing phase with fallback
            processed = await self.processing_chain.execute({
                'content': content,
                'processing_config': adjusted_config['processing']
            })

            # Output phase with fallback
            result = await self.output_chain.execute({
                'processed_content': processed,
                'output_config': adjusted_config['output']
            })

            return result

        # Execute entire workflow with circuit breaker and retry
        return await system.execute_with_resilience(
            execute_with_resilience,
            circuit_breaker_name='workflow_execution',
            enable_retry=True
        )

# Usage
workflow_system = IntegratedWorkflowSystem()
resilient_workflow = ResilientWorkflowSystem(workflow_system)

result = await resilient_workflow.execute_workflow({
    'generation': {'type': 'story', 'length': 'medium'},
    'processing': {'enhance': True, 'validate': True},
    'output': {'format': 'video', 'quality': 'high'}
})
```

## Best Practices

### 1. Configure Appropriate Thresholds

- **Circuit Breakers:** Set failure thresholds based on service criticality
- **Retries:** Limit retries for expensive operations
- **Degradation:** Configure triggers based on system capacity

### 2. Monitor and Alert

```python
# Regular health monitoring
async def monitor_system_health():
    while True:
        health = system.get_system_health()

        if health['error_rate'] > 0.1:  # 10% error rate
            alert_team("High error rate detected")

        if health['degradation_level'] != 'full':
            alert_team(f"System degraded to {health['degradation_level']}")

        await asyncio.sleep(60)  # Check every minute
```

### 3. Test Failure Scenarios

```python
# Unit test for circuit breaker behavior
async def test_circuit_breaker():
    circuit_breaker = system.get_circuit_breaker('test_service')

    # Simulate failures
    for _ in range(6):  # Exceed threshold
        try:
            await circuit_breaker.execute(failing_function)
        except:
            pass

    # Verify circuit is open
    assert circuit_breaker.state == CircuitBreakerState.OPEN

    # Test recovery
    await asyncio.sleep(61)  # Wait for timeout
    result = await circuit_breaker.execute(working_function)
    assert circuit_breaker.state == CircuitBreakerState.CLOSED
```

### 4. Document Fallback Behavior

Clearly document what each fallback provides and any quality trade-offs:

```python
# Documented fallback chain
image_chain = system.get_fallback_chain('image_generation')

# Premium: Full quality, all features (100% success rate expected)
image_chain.add_fallback(generate_premium_image)

# Standard: 80% quality, core features (95% success rate expected)
image_chain.add_fallback(generate_standard_image)

# Basic: 60% quality, minimal features (90% success rate expected)
image_chain.add_fallback(generate_basic_image)

# Cached: 40% quality, instant response (99% success rate)
image_chain.add_fallback(get_cached_image)
```

## Troubleshooting

### Common Issues

#### Circuit Breaker Not Opening
- **Cause:** Failure threshold too high, or exceptions not counted
- **Solution:** Adjust `failure_threshold`, ensure exceptions inherit from `expected_exception`

#### Retry Not Working
- **Cause:** Exception not in `retryable_exceptions`, or `max_attempts` reached
- **Solution:** Add exception to retryable list, increase `max_attempts`

#### Degradation Not Triggering
- **Cause:** Thresholds not reached, or monitoring disabled
- **Solution:** Adjust trigger thresholds, enable health monitoring

#### High Memory Usage
- **Cause:** Too many circuit breakers or large error history
- **Solution:** Reduce number of circuit breakers, limit error history size

### Debug Commands

```python
# Get detailed system status
debug_info = system.get_debug_info()
print(json.dumps(debug_info, indent=2))

# Reset circuit breaker state
circuit_breaker.reset()

# Clear error history
system.error_analytics.clear_history()

# Force degradation level
system.graceful_degradation.set_level('medium')
```

### Performance Tuning

- **Circuit Breakers:** Use different configs for different service types
- **Retries:** Shorter delays for fast operations, longer for slow ones
- **Fallbacks:** Order by speed and success rate, not just quality
- **Monitoring:** Sample health checks rather than checking constantly

---

**This implementation guide provides the foundation for building resilient workflows in StoryCore-Engine. For API details, see the [API Reference](../api/error-handling-api.md). For additional examples, refer to the [Integration Guide](../INTEGRATION_GUIDE.md).**
