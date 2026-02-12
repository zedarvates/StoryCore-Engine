# Fact-Checking System Integration Guide

## Table of Contents

1. [Overview](#overview)
2. [Pipeline Integration Setup](#pipeline-integration-setup)
3. [Hook Configuration](#hook-configuration)
4. [Integration Patterns](#integration-patterns)
5. [Best Practices](#best-practices)
6. [Advanced Topics](#advanced-topics)
7. [Troubleshooting](#troubleshooting)
8. [Examples](#examples)

---

## Overview

This guide provides comprehensive instructions for integrating the Fact-Checking System with the StoryCore-Engine pipeline. The integration enables automated content verification at key stages of your content generation workflow.

### What You'll Learn

- How to set up pipeline integration from scratch
- How to configure hooks for different use cases
- Best practices for production deployments
- Advanced integration patterns and techniques
- How to troubleshoot common integration issues

### Prerequisites

Before integrating the fact-checking system, ensure you have:

- StoryCore-Engine installed and configured
- Python 3.9+ environment
- Fact-checking system installed (`src/fact_checker/` module)
- Basic understanding of async/await in Python
- Familiarity with StoryCore pipeline stages

### Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    StoryCore Pipeline                            │
│                                                                  │
│  Input → before_generate → Generation → after_generate → Publish│
│            ↓                              ↓              ↓       │
└────────────┼──────────────────────────────┼──────────────┼──────┘
             │                              │              │
             ▼                              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Fact-Checking System (Async)                        │
│                                                                  │
│  Verification → Risk Assessment → Storage → Event Emission       │
└─────────────────────────────────────────────────────────────────┘
```


---

## Pipeline Integration Setup

### Step 1: Install Dependencies

Ensure all required dependencies are installed:

```bash
# Install fact-checking system dependencies
pip install jsonschema>=4.17.0

# Verify installation
python -c "from src.fact_checker.pipeline_integration import PipelineIntegration; print('✓ Integration module ready')"
```

### Step 2: Create Project Structure

Set up the directory structure for fact-checking integration:

```bash
# Create fact-checking directory in your project
mkdir -p my_project/fact_checking

# Create configuration directory
mkdir -p my_project/config

# Verify project structure
tree my_project/
# my_project/
# ├── config/
# │   └── pipeline_config.json (to be created)
# ├── fact_checking/ (results stored here)
# └── project.json (StoryCore project file)
```

### Step 3: Initialize Integration

Create an initialization script for your project:

```python
# scripts/init_fact_checking.py
import asyncio
from pathlib import Path
from src.fact_checker.pipeline_integration import PipelineIntegration
from src.fact_checker.models import Configuration

async def initialize_fact_checking(project_path: Path):
    """Initialize fact-checking integration for a project."""
    
    # Create configuration
    config = Configuration(
        confidence_threshold=70.0,
        cache_enabled=True,
        cache_ttl_seconds=86400
    )
    
    # Create integration instance
    integration = PipelineIntegration(
        config=config,
        project_path=project_path
    )
    
    # Test the integration
    test_content = "Water boils at 100 degrees Celsius at sea level."
    result = await integration.execute_hook("before_generate", test_content)
    
    print(f"✓ Integration initialized successfully")
    print(f"  Status: {result.status}")
    print(f"  Response time: {result.processing_time_ms}ms")
    
    integration.shutdown()
    return integration

if __name__ == "__main__":
    project_path = Path("./my_project")
    asyncio.run(initialize_fact_checking(project_path))
```

Run the initialization:

```bash
python scripts/init_fact_checking.py
```


### Step 4: Create Configuration File

Create a `pipeline_config.json` file in your project's config directory:

```json
{
  "fact_checker": {
    "enabled": true,
    "hooks": {
      "before_generate": {
        "enabled": true,
        "mode": "auto",
        "blocking": false,
        "on_high_risk": "warn",
        "confidence_threshold": 70.0,
        "store_results": false
      },
      "after_generate": {
        "enabled": true,
        "mode": "auto",
        "blocking": false,
        "on_high_risk": "warn",
        "confidence_threshold": 70.0,
        "store_results": true
      },
      "on_publish": {
        "enabled": true,
        "mode": "auto",
        "blocking": true,
        "on_high_risk": "block",
        "confidence_threshold": 80.0,
        "store_results": true
      }
    },
    "trusted_sources": {
      "physics": ["Nature Physics", "Physical Review", "CERN"],
      "biology": ["Nature", "Science", "PubMed"],
      "history": ["Smithsonian", "National Archives"],
      "general": ["Encyclopedia Britannica", "Snopes"]
    },
    "cache_enabled": true,
    "cache_ttl_seconds": 86400,
    "max_concurrent_verifications": 5,
    "timeout_seconds": 60
  }
}
```

### Step 5: Integrate with StoryCore Pipeline

Modify your StoryCore pipeline to include fact-checking hooks:

```python
# storycore_pipeline.py
import asyncio
from pathlib import Path
from src.fact_checker.pipeline_integration import PipelineIntegration

class StoryCorePipeline:
    def __init__(self, project_path: Path):
        self.project_path = project_path
        
        # Initialize fact-checking integration
        self.fact_checker = PipelineIntegration(
            project_path=project_path
        )
        
        # Load configuration
        config_path = project_path / "config" / "pipeline_config.json"
        if config_path.exists():
            self.fact_checker.load_hook_configuration(config_path)
        
        # Register event handlers
        self.fact_checker.register_event_callback("warning", self.handle_warning)
    
    def handle_warning(self, event):
        """Handle high-risk content warnings."""
        print(f"⚠️  WARNING: {event['summary']}")
        print(f"   Risk Level: {event['risk_level']}")
        print(f"   Stage: {event['hook_stage']}")
        # Add your custom warning handling logic here
    
    async def run_pipeline(self, script_content: str):
        """Run the complete pipeline with fact-checking integration."""
        
        # Stage 1: Validate input script
        print("Stage 1: Validating input script...")
        validation_result = await self.fact_checker.execute_hook(
            "before_generate",
            script_content
        )
        
        if validation_result.should_block:
            print("❌ Pipeline blocked: High-risk content detected in script")
            return None
        
        # Stage 2: Generate content
        print("Stage 2: Generating content...")
        generated_content = await self.generate_content(script_content)
        
        # Stage 3: Verify generated content
        print("Stage 3: Verifying generated content...")
        verification_result = await self.fact_checker.execute_hook(
            "after_generate",
            generated_content
        )
        
        # Stage 4: Final validation before publish
        print("Stage 4: Final validation...")
        publish_result = await self.fact_checker.execute_hook(
            "on_publish",
            generated_content
        )
        
        if publish_result.should_block:
            print("❌ Publication blocked: High-risk content detected")
            return None
        
        print("✓ Pipeline completed successfully")
        return generated_content
    
    async def generate_content(self, script: str) -> str:
        """Placeholder for actual content generation."""
        # Your StoryCore generation logic here
        return f"Generated content based on: {script[:50]}..."
    
    def shutdown(self):
        """Clean up resources."""
        self.fact_checker.shutdown()

# Usage
async def main():
    pipeline = StoryCorePipeline(Path("./my_project"))
    
    script = """
    The Earth orbits the Sun at an average distance of 93 million miles.
    This journey takes approximately 365.25 days to complete.
    """
    
    result = await pipeline.run_pipeline(script)
    pipeline.shutdown()

if __name__ == "__main__":
    asyncio.run(main())
```


---

## Hook Configuration

### Understanding Hook Stages

The fact-checking system provides three integration points in the pipeline:

#### 1. before_generate Hook

**When**: Before content generation begins  
**Purpose**: Validate input scripts and catch issues early  
**Typical Behavior**: Non-blocking, warns on issues

**Configuration Example**:
```python
from src.fact_checker.pipeline_integration import HookConfig

before_generate_config = HookConfig(
    enabled=True,
    mode="auto",              # Auto-detect text vs video
    blocking=False,           # Don't block pipeline
    on_high_risk="warn",      # Emit warning events
    confidence_threshold=70.0,
    store_results=False       # Don't store (optional validation)
)
```

**Use Cases**:
- Quick validation of user-submitted scripts
- Early detection of problematic claims
- Preventing expensive generation of bad content
- Development/testing environments

#### 2. after_generate Hook

**When**: After content generation completes  
**Purpose**: Verify generated content quality and accuracy  
**Typical Behavior**: Non-blocking, stores results

**Configuration Example**:
```python
after_generate_config = HookConfig(
    enabled=True,
    mode="auto",
    blocking=False,           # Don't block pipeline
    on_high_risk="warn",      # Emit warning events
    confidence_threshold=70.0,
    store_results=True        # Store for analysis
)
```

**Use Cases**:
- Detecting AI hallucinations in generated content
- Quality assurance of automated generation
- Building verification history
- Monitoring content quality trends

#### 3. on_publish Hook

**When**: Before final publication  
**Purpose**: Final quality gate before content goes live  
**Typical Behavior**: Blocking, prevents publication of high-risk content

**Configuration Example**:
```python
on_publish_config = HookConfig(
    enabled=True,
    mode="auto",
    blocking=True,            # Block pipeline if high-risk
    on_high_risk="block",     # Prevent publication
    confidence_threshold=80.0, # Stricter threshold
    store_results=True        # Store for compliance
)
```

**Use Cases**:
- Final compliance check before publication
- Preventing publication of misinformation
- Legal/regulatory compliance
- Production environments


### Configuration Parameters

#### enabled (boolean)

Controls whether the hook is active.

```python
# Enable hook
config = HookConfig(enabled=True)

# Disable hook (hook will be skipped)
config = HookConfig(enabled=False)
```

**Use Cases**:
- Temporarily disable verification during development
- Enable/disable per environment
- A/B testing with and without verification

#### mode (string)

Determines which agent processes the content.

**Options**:
- `"auto"`: Automatically detect content type (recommended)
- `"text"`: Force text analysis (Scientific Audit Agent)
- `"video"`: Force video transcript analysis (Anti-Fake Agent)

```python
# Auto-detection (recommended)
config = HookConfig(mode="auto")

# Force text mode for scripts
config = HookConfig(mode="text")

# Force video mode for transcripts
config = HookConfig(mode="video")
```

**Auto-Detection Logic**:
- Checks for timestamp patterns: `[00:10:30]`, `00:10:30`
- Looks for transcript keywords: "Speaker:", "[music]", "Narrator:"
- Analyzes structural patterns
- Falls back to text mode if uncertain

#### blocking (boolean)

Controls whether the hook waits for verification to complete.

```python
# Non-blocking: Returns immediately, verification continues in background
config = HookConfig(blocking=False)

# Blocking: Waits for verification to complete
config = HookConfig(blocking=True)
```

**Performance Impact**:
- Non-blocking: Returns in < 100ms
- Blocking: Returns in 1-5 seconds (full verification time)

**When to Use**:
- Non-blocking: Early pipeline stages, development, monitoring
- Blocking: Critical decision points, publication gates, compliance

#### on_high_risk (string)

Determines action when high-risk content is detected.

**Options**:
- `"warn"`: Emit warning event, continue pipeline
- `"block"`: Block pipeline execution
- `"ignore"`: No action (verification still runs)

```python
# Warn but continue (development)
config = HookConfig(on_high_risk="warn")

# Block pipeline (production)
config = HookConfig(on_high_risk="block")

# Silent monitoring
config = HookConfig(on_high_risk="ignore")
```

**Risk Levels Considered "High-Risk"**:
- `"high"`: Confidence 30-50%
- `"critical"`: Confidence 0-30%

#### confidence_threshold (float)

Minimum confidence score for claims to be considered verified.

```python
# Permissive (70% confidence)
config = HookConfig(confidence_threshold=70.0)

# Strict (85% confidence)
config = HookConfig(confidence_threshold=85.0)

# Very strict (90% confidence)
config = HookConfig(confidence_threshold=90.0)
```

**Guidelines**:
- **60-70**: Creative content, development
- **70-80**: Standard content, general use
- **80-90**: Journalism, research, compliance
- **90-100**: Critical applications, legal content

#### store_results (boolean)

Controls whether verification results are saved to disk.

```python
# Store results (recommended for production)
config = HookConfig(store_results=True)

# Don't store (saves disk space)
config = HookConfig(store_results=False)
```

**Storage Location**: `{project_path}/fact_checking/{hook_stage}_{timestamp}.json`

**When to Store**:
- Production environments (compliance, auditing)
- Quality monitoring and analysis
- Building verification history
- Debugging and troubleshooting

**When Not to Store**:
- Development/testing (reduces clutter)
- Temporary validation checks
- Disk space constraints
- Privacy concerns


### Environment-Specific Configuration

Configure different behaviors for different environments:

```json
{
  "fact_checker": {
    "environments": {
      "development": {
        "hooks": {
          "before_generate": {
            "enabled": true,
            "blocking": false,
            "on_high_risk": "warn",
            "confidence_threshold": 60.0,
            "store_results": false
          },
          "after_generate": {
            "enabled": false
          },
          "on_publish": {
            "enabled": false
          }
        }
      },
      "staging": {
        "hooks": {
          "before_generate": {
            "enabled": true,
            "blocking": false,
            "on_high_risk": "warn",
            "confidence_threshold": 70.0,
            "store_results": true
          },
          "after_generate": {
            "enabled": true,
            "blocking": false,
            "on_high_risk": "warn",
            "store_results": true
          },
          "on_publish": {
            "enabled": true,
            "blocking": true,
            "on_high_risk": "warn",
            "confidence_threshold": 75.0,
            "store_results": true
          }
        }
      },
      "production": {
        "hooks": {
          "before_generate": {
            "enabled": true,
            "blocking": false,
            "on_high_risk": "warn",
            "confidence_threshold": 75.0,
            "store_results": true
          },
          "after_generate": {
            "enabled": true,
            "blocking": false,
            "on_high_risk": "warn",
            "confidence_threshold": 75.0,
            "store_results": true
          },
          "on_publish": {
            "enabled": true,
            "blocking": true,
            "on_high_risk": "block",
            "confidence_threshold": 85.0,
            "store_results": true
          }
        }
      }
    }
  }
}
```

Load environment-specific configuration:

```python
import os
from pathlib import Path
from src.fact_checker.pipeline_integration import PipelineIntegration

# Get environment from environment variable
environment = os.getenv("STORYCORE_ENV", "development")

# Load configuration
integration = PipelineIntegration(project_path=Path("./my_project"))
config_path = Path(f"./config/pipeline_config.{environment}.json")
integration.load_hook_configuration(config_path)
```


---

## Integration Patterns

### Pattern 1: Basic Non-Blocking Integration

**Use Case**: Development environment, monitoring without disruption

```python
import asyncio
from pathlib import Path
from src.fact_checker.pipeline_integration import PipelineIntegration, HookConfig

async def basic_integration():
    integration = PipelineIntegration(project_path=Path("./my_project"))
    
    # Configure all hooks as non-blocking
    for hook_stage in ["before_generate", "after_generate", "on_publish"]:
        integration.configure_hook(
            hook_stage,
            HookConfig(
                enabled=True,
                blocking=False,
                on_high_risk="warn",
                store_results=True
            )
        )
    
    # Execute pipeline
    content = "Your content here..."
    
    result1 = await integration.execute_hook("before_generate", content)
    # Pipeline continues immediately
    
    # ... generation happens ...
    
    result2 = await integration.execute_hook("after_generate", content)
    # Pipeline continues immediately
    
    result3 = await integration.execute_hook("on_publish", content)
    # Pipeline continues immediately
    
    integration.shutdown()

asyncio.run(basic_integration())
```

### Pattern 2: Progressive Blocking

**Use Case**: Warn early, block at publication

```python
async def progressive_blocking():
    integration = PipelineIntegration(project_path=Path("./my_project"))
    
    # Early stages: Non-blocking warnings
    integration.configure_hook(
        "before_generate",
        HookConfig(enabled=True, blocking=False, on_high_risk="warn")
    )
    
    integration.configure_hook(
        "after_generate",
        HookConfig(enabled=True, blocking=False, on_high_risk="warn")
    )
    
    # Final stage: Blocking
    integration.configure_hook(
        "on_publish",
        HookConfig(enabled=True, blocking=True, on_high_risk="block")
    )
    
    # Execute pipeline
    content = "Your content here..."
    
    # Non-blocking checks
    await integration.execute_hook("before_generate", content)
    await integration.execute_hook("after_generate", content)
    
    # Blocking check
    result = await integration.execute_hook("on_publish", content)
    
    if result.should_block:
        print("❌ Publication blocked due to high-risk content")
        return False
    
    print("✓ Content approved for publication")
    return True

asyncio.run(progressive_blocking())
```

### Pattern 3: Conditional Verification

**Use Case**: Verify only specific content types or conditions

```python
async def conditional_verification(content: str, content_type: str):
    integration = PipelineIntegration(project_path=Path("./my_project"))
    
    # Only verify scientific content
    if content_type in ["scientific", "educational", "documentary"]:
        result = await integration.execute_hook("before_generate", content)
        
        if result.should_block:
            print(f"❌ {content_type} content blocked")
            return False
    
    # Only verify long-form content
    if len(content.split()) > 500:
        result = await integration.execute_hook("after_generate", content)
    
    return True

# Usage
await conditional_verification(script, "scientific")
```

### Pattern 4: Batch Verification

**Use Case**: Verify multiple pieces of content efficiently

```python
async def batch_verification(contents: list[str]):
    integration = PipelineIntegration(project_path=Path("./my_project"))
    
    # Verify all contents concurrently
    tasks = [
        integration.execute_hook("before_generate", content)
        for content in contents
    ]
    
    results = await asyncio.gather(*tasks)
    
    # Analyze results
    blocked_count = sum(1 for r in results if r.should_block)
    
    print(f"Verified {len(contents)} items")
    print(f"Blocked: {blocked_count}")
    print(f"Approved: {len(contents) - blocked_count}")
    
    integration.shutdown()
    return results

# Usage
contents = ["Content 1...", "Content 2...", "Content 3..."]
await batch_verification(contents)
```


### Pattern 5: Event-Driven Integration

**Use Case**: React to verification events in real-time

```python
import asyncio
from pathlib import Path
from src.fact_checker.pipeline_integration import PipelineIntegration

class EventDrivenPipeline:
    def __init__(self, project_path: Path):
        self.integration = PipelineIntegration(project_path=project_path)
        self.warnings = []
        self.blocked_content = []
        
        # Register event handlers
        self.integration.register_event_callback("warning", self.on_warning)
    
    def on_warning(self, event):
        """Handle warning events."""
        self.warnings.append(event)
        
        # Send notification
        self.send_notification(
            f"⚠️ High-risk content detected: {event['summary']}"
        )
        
        # Log to monitoring system
        self.log_to_monitoring(event)
        
        # If critical, alert team
        if event['risk_level'] == 'critical':
            self.alert_team(event)
    
    def send_notification(self, message: str):
        """Send notification (email, Slack, etc.)."""
        print(f"📧 Notification: {message}")
        # Implement your notification logic
    
    def log_to_monitoring(self, event):
        """Log to monitoring system."""
        print(f"📊 Logged to monitoring: {event['risk_level']}")
        # Implement your monitoring integration
    
    def alert_team(self, event):
        """Alert team for critical issues."""
        print(f"🚨 CRITICAL ALERT: {event['summary']}")
        # Implement your alerting logic
    
    async def process_content(self, content: str):
        """Process content with event-driven verification."""
        result = await self.integration.execute_hook("before_generate", content)
        
        if result.should_block:
            self.blocked_content.append(content)
            return None
        
        return content
    
    def get_statistics(self):
        """Get verification statistics."""
        return {
            "total_warnings": len(self.warnings),
            "blocked_count": len(self.blocked_content),
            "critical_warnings": sum(
                1 for w in self.warnings if w['risk_level'] == 'critical'
            )
        }

# Usage
async def main():
    pipeline = EventDrivenPipeline(Path("./my_project"))
    
    # Process multiple contents
    contents = ["Content 1...", "Content 2...", "Content 3..."]
    
    for content in contents:
        await pipeline.process_content(content)
    
    # Get statistics
    stats = pipeline.get_statistics()
    print(f"\nStatistics: {stats}")

asyncio.run(main())
```

### Pattern 6: Retry with Modification

**Use Case**: Automatically retry with content modifications

```python
async def retry_with_modification(content: str, max_retries: int = 3):
    integration = PipelineIntegration(project_path=Path("./my_project"))
    
    for attempt in range(max_retries):
        result = await integration.execute_hook("before_generate", content)
        
        if not result.should_block:
            print(f"✓ Content approved on attempt {attempt + 1}")
            return content
        
        # Extract high-risk claims from result
        if result.verification_result:
            report = result.verification_result.get('report', {})
            high_risk_claims = [
                c for c in report.get('claims', [])
                if c.get('risk_level') in ['high', 'critical']
            ]
            
            # Modify content to address high-risk claims
            print(f"⚠️ Attempt {attempt + 1}: Found {len(high_risk_claims)} high-risk claims")
            
            # Simple modification: Add disclaimer
            content = f"[Disclaimer: Claims require verification]\n\n{content}"
    
    print(f"❌ Content blocked after {max_retries} attempts")
    return None

# Usage
modified_content = await retry_with_modification("Your content here...")
```


---

## Best Practices

### 1. Configuration Management

#### Use Environment Variables

```python
import os
from pathlib import Path

# Load environment-specific configuration
env = os.getenv("STORYCORE_ENV", "development")
config_path = Path(f"./config/pipeline_config.{env}.json")

integration = PipelineIntegration(project_path=Path("./my_project"))
integration.load_hook_configuration(config_path)
```

#### Version Control Configuration

```bash
# Store configuration in version control
git add config/pipeline_config.*.json

# Use .gitignore for sensitive data
echo "config/pipeline_config.local.json" >> .gitignore
```

#### Validate Configuration on Startup

```python
def validate_configuration(integration: PipelineIntegration):
    """Validate configuration before running pipeline."""
    status = integration.get_hook_status()
    
    # Check that critical hooks are enabled
    if not status['hooks']['on_publish']['enabled']:
        raise ValueError("on_publish hook must be enabled in production")
    
    # Check confidence thresholds
    for hook_name, hook_status in status['hooks'].items():
        threshold = hook_status.get('confidence_threshold', 0)
        if threshold < 60:
            print(f"⚠️ Warning: {hook_name} has low threshold ({threshold})")
    
    print("✓ Configuration validated")

# Usage
validate_configuration(integration)
```

### 2. Error Handling

#### Graceful Degradation

```python
async def safe_hook_execution(integration, hook_stage, content):
    """Execute hook with graceful error handling."""
    try:
        result = await integration.execute_hook(hook_stage, content)
        return result
    except Exception as e:
        print(f"⚠️ Hook execution failed: {e}")
        
        # Log error
        logger.error(f"Hook {hook_stage} failed", exc_info=True)
        
        # Return safe default (don't block pipeline)
        return HookResult(
            status="failed",
            should_block=False,
            error=str(e)
        )

# Usage
result = await safe_hook_execution(integration, "before_generate", content)
```

#### Timeout Handling

```python
async def execute_with_timeout(integration, hook_stage, content, timeout=10):
    """Execute hook with timeout."""
    try:
        result = await asyncio.wait_for(
            integration.execute_hook(hook_stage, content),
            timeout=timeout
        )
        return result
    except asyncio.TimeoutError:
        print(f"⚠️ Hook {hook_stage} timed out after {timeout}s")
        return HookResult(status="timeout", should_block=False)

# Usage
result = await execute_with_timeout(integration, "before_generate", content, timeout=5)
```

### 3. Performance Optimization

#### Enable Caching

```python
from src.fact_checker.models import Configuration

config = Configuration(
    cache_enabled=True,
    cache_ttl_seconds=86400,  # 24 hours
    max_concurrent_verifications=5
)

integration = PipelineIntegration(config=config, project_path=project_path)
```

#### Batch Processing

```python
async def batch_process_with_concurrency(contents: list[str], max_concurrent=5):
    """Process multiple contents with concurrency limit."""
    integration = PipelineIntegration(project_path=Path("./my_project"))
    
    # Create semaphore for concurrency control
    semaphore = asyncio.Semaphore(max_concurrent)
    
    async def process_one(content):
        async with semaphore:
            return await integration.execute_hook("before_generate", content)
    
    # Process all contents
    results = await asyncio.gather(*[process_one(c) for c in contents])
    
    integration.shutdown()
    return results

# Usage
results = await batch_process_with_concurrency(contents, max_concurrent=3)
```

#### Selective Verification

```python
def should_verify(content: str, metadata: dict) -> bool:
    """Determine if content needs verification."""
    
    # Skip very short content
    if len(content.split()) < 50:
        return False
    
    # Always verify scientific content
    if metadata.get('category') in ['scientific', 'medical', 'legal']:
        return True
    
    # Skip verified content
    if metadata.get('previously_verified'):
        return False
    
    return True

# Usage
if should_verify(content, metadata):
    result = await integration.execute_hook("before_generate", content)
```


### 4. Monitoring and Observability

#### Structured Logging

```python
import logging
import json
from datetime import datetime

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(message)s'
)
logger = logging.getLogger(__name__)

def log_verification_event(hook_stage: str, result: HookResult):
    """Log verification event in structured format."""
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "event_type": "fact_check_verification",
        "hook_stage": hook_stage,
        "status": result.status,
        "should_block": result.should_block,
        "processing_time_ms": result.processing_time_ms
    }
    
    if result.verification_result:
        report = result.verification_result.get('report', {})
        stats = report.get('summary_statistics', {})
        log_entry.update({
            "total_claims": stats.get('total_claims', 0),
            "high_risk_count": stats.get('high_risk_count', 0),
            "average_confidence": stats.get('average_confidence', 0)
        })
    
    logger.info(json.dumps(log_entry))

# Usage
result = await integration.execute_hook("before_generate", content)
log_verification_event("before_generate", result)
```

#### Metrics Collection

```python
from collections import defaultdict
from datetime import datetime

class VerificationMetrics:
    def __init__(self):
        self.metrics = defaultdict(int)
        self.timings = []
    
    def record_verification(self, hook_stage: str, result: HookResult):
        """Record verification metrics."""
        self.metrics[f"{hook_stage}_total"] += 1
        
        if result.should_block:
            self.metrics[f"{hook_stage}_blocked"] += 1
        
        if result.status == "failed":
            self.metrics[f"{hook_stage}_failed"] += 1
        
        self.timings.append({
            "hook_stage": hook_stage,
            "processing_time_ms": result.processing_time_ms,
            "timestamp": datetime.utcnow()
        })
    
    def get_summary(self):
        """Get metrics summary."""
        return {
            "total_verifications": sum(
                v for k, v in self.metrics.items() if k.endswith("_total")
            ),
            "total_blocked": sum(
                v for k, v in self.metrics.items() if k.endswith("_blocked")
            ),
            "total_failed": sum(
                v for k, v in self.metrics.items() if k.endswith("_failed")
            ),
            "average_processing_time_ms": sum(
                t["processing_time_ms"] for t in self.timings
            ) / len(self.timings) if self.timings else 0
        }

# Usage
metrics = VerificationMetrics()

result = await integration.execute_hook("before_generate", content)
metrics.record_verification("before_generate", result)

print(metrics.get_summary())
```

#### Health Checks

```python
async def health_check(integration: PipelineIntegration) -> dict:
    """Perform health check on fact-checking integration."""
    health = {
        "status": "healthy",
        "checks": {}
    }
    
    # Check hook status
    hook_status = integration.get_hook_status()
    health["checks"]["hooks_configured"] = len(hook_status['hooks']) > 0
    
    # Test verification with simple content
    try:
        test_content = "Water boils at 100 degrees Celsius."
        result = await asyncio.wait_for(
            integration.execute_hook("before_generate", test_content),
            timeout=5
        )
        health["checks"]["verification_working"] = result.status != "failed"
    except Exception as e:
        health["checks"]["verification_working"] = False
        health["status"] = "unhealthy"
        health["error"] = str(e)
    
    # Check storage
    if integration.project_path:
        fact_check_dir = integration.project_path / "fact_checking"
        health["checks"]["storage_accessible"] = fact_check_dir.exists()
    
    return health

# Usage
health = await health_check(integration)
print(f"Health Status: {health['status']}")
```

### 5. Security and Compliance

#### Audit Trail

```python
import hashlib
from datetime import datetime

def create_audit_entry(content: str, result: HookResult, user_id: str = None):
    """Create audit trail entry."""
    audit_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "content_hash": hashlib.sha256(content.encode()).hexdigest(),
        "user_id": user_id,
        "verification_status": result.status,
        "should_block": result.should_block,
        "hook_stage": result.hook_stage if hasattr(result, 'hook_stage') else None
    }
    
    # Store audit entry
    audit_file = Path("./audit_log.jsonl")
    with open(audit_file, "a") as f:
        f.write(json.dumps(audit_entry) + "\n")
    
    return audit_entry

# Usage
result = await integration.execute_hook("on_publish", content)
create_audit_entry(content, result, user_id="user123")
```

#### Data Retention

```python
from datetime import datetime, timedelta
import shutil

def cleanup_old_verifications(project_path: Path, retention_days: int = 90):
    """Remove verification results older than retention period."""
    fact_check_dir = project_path / "fact_checking"
    cutoff_date = datetime.now() - timedelta(days=retention_days)
    
    removed_count = 0
    
    for result_file in fact_check_dir.glob("*.json"):
        # Parse timestamp from filename
        # Format: {hook_stage}_{YYYYMMDD_HHMMSS}.json
        try:
            timestamp_str = result_file.stem.split("_", 1)[1]
            file_date = datetime.strptime(timestamp_str, "%Y%m%d_%H%M%S")
            
            if file_date < cutoff_date:
                result_file.unlink()
                removed_count += 1
        except (ValueError, IndexError):
            continue
    
    print(f"Removed {removed_count} old verification results")

# Usage (run periodically)
cleanup_old_verifications(Path("./my_project"), retention_days=90)
```


---

## Advanced Topics

### Custom Event Handlers

Create sophisticated event handling logic:

```python
class AdvancedEventHandler:
    def __init__(self):
        self.warning_history = []
        self.alert_cooldown = {}
    
    def handle_warning(self, event):
        """Advanced warning handler with cooldown and escalation."""
        self.warning_history.append(event)
        
        # Check if we should alert (cooldown logic)
        hook_stage = event['hook_stage']
        last_alert = self.alert_cooldown.get(hook_stage)
        
        if last_alert and (datetime.now() - last_alert).seconds < 300:
            # Don't alert if we alerted in last 5 minutes
            return
        
        # Escalate based on frequency
        recent_warnings = [
            w for w in self.warning_history[-10:]
            if w['hook_stage'] == hook_stage
        ]
        
        if len(recent_warnings) >= 5:
            self.escalate_alert(event, "High frequency of warnings")
        elif event['risk_level'] == 'critical':
            self.escalate_alert(event, "Critical risk detected")
        else:
            self.send_standard_alert(event)
        
        self.alert_cooldown[hook_stage] = datetime.now()
    
    def escalate_alert(self, event, reason):
        """Escalate to higher priority alert."""
        print(f"🚨 ESCALATED: {reason}")
        print(f"   Event: {event['summary']}")
        # Send to on-call team, create incident, etc.
    
    def send_standard_alert(self, event):
        """Send standard alert."""
        print(f"⚠️ Warning: {event['summary']}")
        # Send to monitoring channel

# Usage
handler = AdvancedEventHandler()
integration.register_event_callback("warning", handler.handle_warning)
```

### Dynamic Configuration Updates

Update configuration without restarting:

```python
class DynamicIntegration:
    def __init__(self, project_path: Path):
        self.integration = PipelineIntegration(project_path=project_path)
        self.config_file = project_path / "config" / "pipeline_config.json"
        self.last_config_mtime = 0
    
    def reload_config_if_changed(self):
        """Reload configuration if file has changed."""
        if not self.config_file.exists():
            return
        
        current_mtime = self.config_file.stat().st_mtime
        
        if current_mtime > self.last_config_mtime:
            print("📝 Configuration file changed, reloading...")
            self.integration.load_hook_configuration(self.config_file)
            self.last_config_mtime = current_mtime
            print("✓ Configuration reloaded")
    
    async def execute_hook(self, hook_stage: str, content: str):
        """Execute hook with automatic config reload."""
        self.reload_config_if_changed()
        return await self.integration.execute_hook(hook_stage, content)

# Usage
dynamic_integration = DynamicIntegration(Path("./my_project"))
result = await dynamic_integration.execute_hook("before_generate", content)
```

### Multi-Project Integration

Manage fact-checking across multiple projects:

```python
class MultiProjectIntegration:
    def __init__(self):
        self.integrations = {}
    
    def get_integration(self, project_path: Path) -> PipelineIntegration:
        """Get or create integration for project."""
        project_key = str(project_path)
        
        if project_key not in self.integrations:
            self.integrations[project_key] = PipelineIntegration(
                project_path=project_path
            )
        
        return self.integrations[project_key]
    
    async def verify_across_projects(self, project_contents: dict):
        """Verify content across multiple projects."""
        results = {}
        
        for project_path, content in project_contents.items():
            integration = self.get_integration(Path(project_path))
            result = await integration.execute_hook("before_generate", content)
            results[project_path] = result
        
        return results
    
    def shutdown_all(self):
        """Shutdown all integrations."""
        for integration in self.integrations.values():
            integration.shutdown()

# Usage
multi_project = MultiProjectIntegration()

project_contents = {
    "./project1": "Content for project 1...",
    "./project2": "Content for project 2..."
}

results = await multi_project.verify_across_projects(project_contents)
multi_project.shutdown_all()
```

### Custom Storage Backends

Implement custom storage for verification results:

```python
from abc import ABC, abstractmethod

class StorageBackend(ABC):
    @abstractmethod
    async def store_result(self, hook_stage: str, result: dict):
        """Store verification result."""
        pass
    
    @abstractmethod
    async def retrieve_result(self, hook_stage: str, timestamp: str) -> dict:
        """Retrieve verification result."""
        pass

class DatabaseStorage(StorageBackend):
    def __init__(self, db_connection):
        self.db = db_connection
    
    async def store_result(self, hook_stage: str, result: dict):
        """Store result in database."""
        await self.db.execute(
            "INSERT INTO fact_check_results (hook_stage, result, timestamp) VALUES (?, ?, ?)",
            (hook_stage, json.dumps(result), datetime.utcnow())
        )
    
    async def retrieve_result(self, hook_stage: str, timestamp: str) -> dict:
        """Retrieve result from database."""
        row = await self.db.fetch_one(
            "SELECT result FROM fact_check_results WHERE hook_stage = ? AND timestamp = ?",
            (hook_stage, timestamp)
        )
        return json.loads(row['result']) if row else None

class S3Storage(StorageBackend):
    def __init__(self, bucket_name: str):
        self.bucket = bucket_name
        # Initialize S3 client
    
    async def store_result(self, hook_stage: str, result: dict):
        """Store result in S3."""
        key = f"fact_checking/{hook_stage}/{datetime.utcnow().isoformat()}.json"
        # Upload to S3
        pass
    
    async def retrieve_result(self, hook_stage: str, timestamp: str) -> dict:
        """Retrieve result from S3."""
        key = f"fact_checking/{hook_stage}/{timestamp}.json"
        # Download from S3
        pass

# Usage with custom storage
storage = DatabaseStorage(db_connection)
# Integrate with PipelineIntegration (requires modification to support custom storage)
```


---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Hook Not Executing

**Symptoms**: Hook appears to be skipped, no verification results

**Diagnosis**:
```python
# Check hook status
status = integration.get_hook_status()
print(json.dumps(status, indent=2))

# Check if hook is enabled
if not status['hooks']['before_generate']['enabled']:
    print("❌ Hook is disabled")
```

**Solutions**:
1. Verify hook is enabled in configuration
2. Check that content is not empty
3. Ensure integration is properly initialized
4. Review logs for errors

#### Issue 2: Slow Performance

**Symptoms**: Hooks taking longer than expected

**Diagnosis**:
```python
import time

start = time.time()
result = await integration.execute_hook("before_generate", content)
duration = time.time() - start

print(f"Hook execution took {duration:.2f}s")
print(f"Reported processing time: {result.processing_time_ms}ms")
```

**Solutions**:
1. Enable caching:
   ```python
   config = Configuration(cache_enabled=True)
   ```

2. Reduce content size:
   ```python
   # Verify only first 5000 words
   content_preview = ' '.join(content.split()[:5000])
   result = await integration.execute_hook("before_generate", content_preview)
   ```

3. Use non-blocking hooks:
   ```python
   config = HookConfig(blocking=False)
   ```

4. Increase timeout:
   ```python
   config = Configuration(timeout_seconds=120)
   ```

#### Issue 3: Results Not Stored

**Symptoms**: Verification completes but no files in `fact_checking/` directory

**Diagnosis**:
```python
# Check if storage is enabled
hook_config = integration.get_hook_status()['hooks']['before_generate']
print(f"Store results: {hook_config.get('store_results', False)}")

# Check directory permissions
fact_check_dir = project_path / "fact_checking"
print(f"Directory exists: {fact_check_dir.exists()}")
print(f"Directory writable: {os.access(fact_check_dir, os.W_OK)}")
```

**Solutions**:
1. Enable result storage:
   ```python
   config = HookConfig(store_results=True)
   integration.configure_hook("before_generate", config)
   ```

2. Create directory:
   ```python
   fact_check_dir = project_path / "fact_checking"
   fact_check_dir.mkdir(parents=True, exist_ok=True)
   ```

3. Check disk space:
   ```bash
   df -h
   ```

#### Issue 4: Warning Events Not Received

**Symptoms**: High-risk content detected but no warnings

**Diagnosis**:
```python
# Check if callback is registered
# (No direct API, check your code)

# Check on_high_risk setting
hook_config = integration.get_hook_status()['hooks']['before_generate']
print(f"On high risk: {hook_config.get('on_high_risk', 'warn')}")

# Manually check if content is high-risk
result = await integration.execute_hook("before_generate", content)
if result.verification_result:
    report = result.verification_result['report']
    stats = report['summary_statistics']
    print(f"High-risk count: {stats.get('high_risk_count', 0)}")
```

**Solutions**:
1. Register callback:
   ```python
   integration.register_event_callback("warning", handle_warning)
   ```

2. Check on_high_risk setting:
   ```python
   config = HookConfig(on_high_risk="warn")  # Not "ignore"
   ```

3. Lower confidence threshold:
   ```python
   config = HookConfig(confidence_threshold=60.0)
   ```

#### Issue 5: Pipeline Blocked Unexpectedly

**Symptoms**: Pipeline stops at publication stage

**Diagnosis**:
```python
result = await integration.execute_hook("on_publish", content)

print(f"Should block: {result.should_block}")
print(f"Status: {result.status}")

if result.verification_result:
    report = result.verification_result['report']
    high_risk_claims = [
        c for c in report['claims']
        if c['risk_level'] in ['high', 'critical']
    ]
    
    print(f"\nHigh-risk claims ({len(high_risk_claims)}):")
    for claim in high_risk_claims:
        print(f"  - {claim['text']}")
        print(f"    Confidence: {claim['confidence']}")
        print(f"    Risk: {claim['risk_level']}")
```

**Solutions**:
1. Review high-risk claims and modify content
2. Lower confidence threshold (if appropriate):
   ```python
   config = HookConfig(confidence_threshold=70.0)  # From 80.0
   ```

3. Change blocking behavior (development only):
   ```python
   config = HookConfig(on_high_risk="warn")  # Instead of "block"
   ```

4. Add manual review workflow:
   ```python
   if result.should_block:
       # Request manual review
       approved = await request_manual_review(content, result)
       if approved:
           # Override block
           pass
   ```


### Debugging Tips

#### Enable Debug Logging

```python
import logging

# Enable debug logging for fact-checking system
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Enable specific loggers
logging.getLogger('src.fact_checker').setLevel(logging.DEBUG)
logging.getLogger('src.fact_checker.pipeline_integration').setLevel(logging.DEBUG)
```

#### Inspect Hook Results

```python
async def debug_hook_execution(integration, hook_stage, content):
    """Execute hook with detailed debugging."""
    print(f"\n{'='*60}")
    print(f"Debugging {hook_stage} hook")
    print(f"{'='*60}")
    
    print(f"\nContent length: {len(content)} characters")
    print(f"Content preview: {content[:100]}...")
    
    start_time = time.time()
    result = await integration.execute_hook(hook_stage, content)
    duration = time.time() - start_time
    
    print(f"\nResult:")
    print(f"  Status: {result.status}")
    print(f"  Should block: {result.should_block}")
    print(f"  Processing time: {result.processing_time_ms}ms")
    print(f"  Wall clock time: {duration:.2f}s")
    
    if result.verification_result:
        report = result.verification_result['report']
        stats = report.get('summary_statistics', {})
        print(f"\nVerification Statistics:")
        print(f"  Total claims: {stats.get('total_claims', 0)}")
        print(f"  High-risk count: {stats.get('high_risk_count', 0)}")
        print(f"  Average confidence: {stats.get('average_confidence', 0):.1f}%")
    
    if result.error:
        print(f"\nError: {result.error}")
    
    print(f"{'='*60}\n")
    
    return result

# Usage
result = await debug_hook_execution(integration, "before_generate", content)
```

#### Test with Known Content

```python
# Test cases with known outcomes
test_cases = [
    {
        "name": "High confidence claim",
        "content": "Water boils at 100 degrees Celsius at sea level.",
        "expected_risk": "low"
    },
    {
        "name": "Uncertain claim",
        "content": "The ancient civilization of Atlantis was located in the Mediterranean.",
        "expected_risk": "high"
    },
    {
        "name": "Empty content",
        "content": "",
        "expected_status": "failed"
    }
]

for test_case in test_cases:
    print(f"\nTesting: {test_case['name']}")
    result = await integration.execute_hook("before_generate", test_case['content'])
    print(f"  Status: {result.status}")
    
    if result.verification_result:
        report = result.verification_result['report']
        if report.get('claims'):
            risk = report['claims'][0]['risk_level']
            print(f"  Risk level: {risk}")
            
            if 'expected_risk' in test_case:
                assert risk == test_case['expected_risk'], f"Expected {test_case['expected_risk']}, got {risk}"
```

### Performance Profiling

```python
import cProfile
import pstats
from io import StringIO

async def profile_hook_execution():
    """Profile hook execution to identify bottlenecks."""
    profiler = cProfile.Profile()
    
    profiler.enable()
    result = await integration.execute_hook("before_generate", content)
    profiler.disable()
    
    # Print statistics
    s = StringIO()
    ps = pstats.Stats(profiler, stream=s).sort_stats('cumulative')
    ps.print_stats(20)  # Top 20 functions
    
    print(s.getvalue())
    
    return result

# Usage
await profile_hook_execution()
```

### Integration Testing

```python
import pytest

@pytest.mark.asyncio
async def test_pipeline_integration():
    """Test complete pipeline integration."""
    project_path = Path("./test_project")
    project_path.mkdir(exist_ok=True)
    
    integration = PipelineIntegration(project_path=project_path)
    
    # Test before_generate hook
    content = "Water boils at 100 degrees Celsius."
    result = await integration.execute_hook("before_generate", content)
    
    assert result.status == "processing" or result.status == "completed"
    assert not result.should_block
    
    # Test after_generate hook
    result = await integration.execute_hook("after_generate", content)
    assert result.status in ["processing", "completed"]
    
    # Test on_publish hook
    result = await integration.execute_hook("on_publish", content)
    assert result.status in ["processing", "completed"]
    
    integration.shutdown()
    
    # Cleanup
    import shutil
    shutil.rmtree(project_path)

# Run test
pytest.main([__file__, "-v"])
```


---

## Examples

### Example 1: Basic StoryCore Integration

Complete example of integrating fact-checking with StoryCore pipeline:

```python
# storycore_integration.py
import asyncio
from pathlib import Path
from src.fact_checker.pipeline_integration import PipelineIntegration, HookConfig

class StoryCorePipelineWithFactChecking:
    def __init__(self, project_path: Path):
        self.project_path = project_path
        self.integration = PipelineIntegration(project_path=project_path)
        
        # Configure hooks
        self.setup_hooks()
        
        # Register event handlers
        self.integration.register_event_callback("warning", self.on_warning)
    
    def setup_hooks(self):
        """Configure fact-checking hooks."""
        # Before generation: Quick validation
        self.integration.configure_hook(
            "before_generate",
            HookConfig(
                enabled=True,
                mode="auto",
                blocking=False,
                on_high_risk="warn",
                confidence_threshold=70.0,
                store_results=False
            )
        )
        
        # After generation: Verify output
        self.integration.configure_hook(
            "after_generate",
            HookConfig(
                enabled=True,
                mode="auto",
                blocking=False,
                on_high_risk="warn",
                confidence_threshold=70.0,
                store_results=True
            )
        )
        
        # Before publish: Final gate
        self.integration.configure_hook(
            "on_publish",
            HookConfig(
                enabled=True,
                mode="auto",
                blocking=True,
                on_high_risk="block",
                confidence_threshold=80.0,
                store_results=True
            )
        )
    
    def on_warning(self, event):
        """Handle warning events."""
        print(f"\n⚠️  FACT-CHECK WARNING")
        print(f"Stage: {event['hook_stage']}")
        print(f"Risk Level: {event['risk_level']}")
        print(f"Summary: {event['summary']}")
        print(f"Details: {event['details']}\n")
    
    async def process_script(self, script: str) -> dict:
        """Process script through complete pipeline."""
        print("="*60)
        print("STORYCORE PIPELINE WITH FACT-CHECKING")
        print("="*60)
        
        # Stage 1: Validate script
        print("\n[1/4] Validating script...")
        validation = await self.integration.execute_hook("before_generate", script)
        
        if validation.should_block:
            return {"status": "blocked", "stage": "validation", "result": validation}
        
        print(f"✓ Validation complete ({validation.processing_time_ms}ms)")
        
        # Stage 2: Generate content (placeholder)
        print("\n[2/4] Generating content...")
        generated_content = await self.generate_content(script)
        print(f"✓ Generated {len(generated_content)} characters")
        
        # Stage 3: Verify generated content
        print("\n[3/4] Verifying generated content...")
        verification = await self.integration.execute_hook(
            "after_generate",
            generated_content
        )
        print(f"✓ Verification complete ({verification.processing_time_ms}ms)")
        
        # Stage 4: Final check before publish
        print("\n[4/4] Final publication check...")
        publish_check = await self.integration.execute_hook(
            "on_publish",
            generated_content
        )
        
        if publish_check.should_block:
            print("❌ Publication BLOCKED due to high-risk content")
            return {
                "status": "blocked",
                "stage": "publication",
                "result": publish_check
            }
        
        print(f"✓ Publication approved ({publish_check.processing_time_ms}ms)")
        
        print("\n" + "="*60)
        print("✓ PIPELINE COMPLETED SUCCESSFULLY")
        print("="*60)
        
        return {
            "status": "success",
            "content": generated_content,
            "validation": validation,
            "verification": verification,
            "publish_check": publish_check
        }
    
    async def generate_content(self, script: str) -> str:
        """Placeholder for actual content generation."""
        # Simulate generation delay
        await asyncio.sleep(0.5)
        
        # In real implementation, this would call StoryCore generation
        return f"Generated content based on script:\n\n{script}"
    
    def shutdown(self):
        """Clean up resources."""
        self.integration.shutdown()

# Usage
async def main():
    # Create project
    project_path = Path("./my_storycore_project")
    project_path.mkdir(exist_ok=True)
    
    # Initialize pipeline
    pipeline = StoryCorePipelineWithFactChecking(project_path)
    
    # Example script
    script = """
    The Earth orbits the Sun at an average distance of 93 million miles,
    also known as one astronomical unit (AU). This journey takes 
    approximately 365.25 days, which is why we have a leap year every 
    four years to keep our calendar aligned with Earth's orbit.
    
    The Moon orbits Earth at an average distance of 238,855 miles and
    completes one orbit every 27.3 days. This is why we see different
    phases of the Moon throughout the month.
    """
    
    # Process script
    result = await pipeline.process_script(script)
    
    # Check result
    if result['status'] == 'success':
        print("\n✓ Content ready for publication")
    else:
        print(f"\n❌ Pipeline stopped at {result['stage']} stage")
    
    # Cleanup
    pipeline.shutdown()

if __name__ == "__main__":
    asyncio.run(main())
```


### Example 2: Production Deployment with Monitoring

Production-ready integration with comprehensive monitoring:

```python
# production_integration.py
import asyncio
import logging
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List
from src.fact_checker.pipeline_integration import PipelineIntegration, HookConfig
from src.fact_checker.models import Configuration

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('fact_checking.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class ProductionFactCheckingIntegration:
    def __init__(self, project_path: Path, environment: str = "production"):
        self.project_path = project_path
        self.environment = environment
        
        # Metrics
        self.metrics = {
            "total_verifications": 0,
            "blocked_count": 0,
            "warning_count": 0,
            "average_processing_time": 0
        }
        
        # Initialize integration
        config = self.create_configuration()
        self.integration = PipelineIntegration(
            config=config,
            project_path=project_path
        )
        
        # Load environment-specific configuration
        self.load_environment_config()
        
        # Register event handlers
        self.integration.register_event_callback("warning", self.handle_warning)
        
        logger.info(f"Initialized fact-checking integration for {environment}")
    
    def create_configuration(self) -> Configuration:
        """Create environment-specific configuration."""
        if self.environment == "production":
            return Configuration(
                confidence_threshold=80.0,
                cache_enabled=True,
                cache_ttl_seconds=86400,
                max_concurrent_verifications=5,
                timeout_seconds=60
            )
        elif self.environment == "staging":
            return Configuration(
                confidence_threshold=75.0,
                cache_enabled=True,
                cache_ttl_seconds=3600,
                max_concurrent_verifications=3,
                timeout_seconds=90
            )
        else:  # development
            return Configuration(
                confidence_threshold=60.0,
                cache_enabled=False,
                max_concurrent_verifications=2,
                timeout_seconds=120
            )
    
    def load_environment_config(self):
        """Load environment-specific hook configuration."""
        config_file = self.project_path / "config" / f"pipeline_config.{self.environment}.json"
        
        if config_file.exists():
            self.integration.load_hook_configuration(config_file)
            logger.info(f"Loaded configuration from {config_file}")
        else:
            logger.warning(f"Configuration file not found: {config_file}")
            self.use_default_hooks()
    
    def use_default_hooks(self):
        """Configure default hooks for environment."""
        if self.environment == "production":
            # Production: Strict validation
            self.integration.configure_hook(
                "before_generate",
                HookConfig(enabled=True, blocking=False, on_high_risk="warn",
                          confidence_threshold=80.0, store_results=True)
            )
            self.integration.configure_hook(
                "after_generate",
                HookConfig(enabled=True, blocking=False, on_high_risk="warn",
                          confidence_threshold=80.0, store_results=True)
            )
            self.integration.configure_hook(
                "on_publish",
                HookConfig(enabled=True, blocking=True, on_high_risk="block",
                          confidence_threshold=85.0, store_results=True)
            )
        else:
            # Development/Staging: Permissive
            for hook in ["before_generate", "after_generate", "on_publish"]:
                self.integration.configure_hook(
                    hook,
                    HookConfig(enabled=True, blocking=False, on_high_risk="warn",
                              confidence_threshold=70.0, store_results=True)
                )
    
    def handle_warning(self, event: Dict):
        """Handle warning events with monitoring integration."""
        self.metrics["warning_count"] += 1
        
        # Log warning
        logger.warning(
            f"High-risk content detected: {event['summary']} "
            f"(Risk: {event['risk_level']}, Stage: {event['hook_stage']})"
        )
        
        # Send to monitoring system
        self.send_to_monitoring({
            "metric": "fact_check.warning",
            "value": 1,
            "tags": {
                "risk_level": event['risk_level'],
                "hook_stage": event['hook_stage'],
                "environment": self.environment
            }
        })
        
        # Alert on critical issues
        if event['risk_level'] == 'critical':
            self.send_alert(event)
    
    def send_to_monitoring(self, metric_data: Dict):
        """Send metrics to monitoring system (placeholder)."""
        # Integrate with your monitoring system (DataDog, Prometheus, etc.)
        logger.info(f"Metric: {json.dumps(metric_data)}")
    
    def send_alert(self, event: Dict):
        """Send alert for critical issues (placeholder)."""
        # Integrate with your alerting system (PagerDuty, Slack, etc.)
        logger.critical(f"ALERT: Critical risk detected - {event['summary']}")
    
    async def verify_content(self, hook_stage: str, content: str) -> Dict:
        """Verify content with metrics tracking."""
        self.metrics["total_verifications"] += 1
        
        start_time = datetime.now()
        
        try:
            result = await self.integration.execute_hook(hook_stage, content)
            
            # Update metrics
            processing_time = result.processing_time_ms
            self.update_average_processing_time(processing_time)
            
            if result.should_block:
                self.metrics["blocked_count"] += 1
            
            # Log result
            logger.info(
                f"Verification complete: {hook_stage} "
                f"(Status: {result.status}, Time: {processing_time}ms, "
                f"Blocked: {result.should_block})"
            )
            
            # Send metrics
            self.send_to_monitoring({
                "metric": "fact_check.verification",
                "value": processing_time,
                "tags": {
                    "hook_stage": hook_stage,
                    "status": result.status,
                    "blocked": result.should_block,
                    "environment": self.environment
                }
            })
            
            return {
                "success": True,
                "result": result,
                "processing_time_ms": processing_time
            }
            
        except Exception as e:
            logger.error(f"Verification failed: {hook_stage} - {str(e)}", exc_info=True)
            
            self.send_to_monitoring({
                "metric": "fact_check.error",
                "value": 1,
                "tags": {
                    "hook_stage": hook_stage,
                    "error_type": type(e).__name__,
                    "environment": self.environment
                }
            })
            
            return {
                "success": False,
                "error": str(e)
            }
    
    def update_average_processing_time(self, new_time: float):
        """Update rolling average of processing time."""
        current_avg = self.metrics["average_processing_time"]
        total = self.metrics["total_verifications"]
        
        self.metrics["average_processing_time"] = (
            (current_avg * (total - 1) + new_time) / total
        )
    
    def get_metrics(self) -> Dict:
        """Get current metrics."""
        return {
            **self.metrics,
            "environment": self.environment,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def health_check(self) -> Dict:
        """Perform health check."""
        status = self.integration.get_hook_status()
        
        return {
            "healthy": True,
            "environment": self.environment,
            "hooks_configured": len(status['hooks']),
            "metrics": self.get_metrics()
        }
    
    def shutdown(self):
        """Shutdown with final metrics report."""
        logger.info(f"Shutting down fact-checking integration")
        logger.info(f"Final metrics: {json.dumps(self.get_metrics(), indent=2)}")
        
        self.integration.shutdown()

# Usage
async def main():
    # Initialize for production
    integration = ProductionFactCheckingIntegration(
        project_path=Path("./production_project"),
        environment="production"
    )
    
    # Health check
    health = integration.health_check()
    print(f"Health check: {json.dumps(health, indent=2)}")
    
    # Process content
    content = "Your content here..."
    
    result = await integration.verify_content("before_generate", content)
    
    if result['success']:
        print(f"✓ Verification successful ({result['processing_time_ms']}ms)")
    else:
        print(f"❌ Verification failed: {result['error']}")
    
    # Get metrics
    metrics = integration.get_metrics()
    print(f"\nMetrics: {json.dumps(metrics, indent=2)}")
    
    # Shutdown
    integration.shutdown()

if __name__ == "__main__":
    asyncio.run(main())
```


### Example 3: Batch Processing Pipeline

Process multiple documents efficiently:

```python
# batch_processing.py
import asyncio
from pathlib import Path
from typing import List, Dict
from src.fact_checker.pipeline_integration import PipelineIntegration, HookConfig

class BatchFactCheckingPipeline:
    def __init__(self, project_path: Path, max_concurrent: int = 5):
        self.project_path = project_path
        self.max_concurrent = max_concurrent
        self.integration = PipelineIntegration(project_path=project_path)
        
        # Configure for batch processing
        self.integration.configure_hook(
            "before_generate",
            HookConfig(
                enabled=True,
                blocking=False,
                on_high_risk="warn",
                store_results=True
            )
        )
        
        self.results = []
    
    async def process_batch(self, documents: List[Dict]) -> List[Dict]:
        """Process multiple documents with concurrency control."""
        print(f"Processing {len(documents)} documents...")
        print(f"Max concurrent: {self.max_concurrent}")
        
        # Create semaphore for concurrency control
        semaphore = asyncio.Semaphore(self.max_concurrent)
        
        async def process_one(doc: Dict) -> Dict:
            async with semaphore:
                return await self.process_document(doc)
        
        # Process all documents
        tasks = [process_one(doc) for doc in documents]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Analyze results
        self.analyze_batch_results(results)
        
        return results
    
    async def process_document(self, document: Dict) -> Dict:
        """Process a single document."""
        doc_id = document.get('id', 'unknown')
        content = document.get('content', '')
        
        print(f"  Processing document {doc_id}...")
        
        try:
            result = await self.integration.execute_hook(
                "before_generate",
                content
            )
            
            return {
                "id": doc_id,
                "status": "success",
                "should_block": result.should_block,
                "processing_time_ms": result.processing_time_ms,
                "verification_result": result.verification_result
            }
            
        except Exception as e:
            print(f"  ❌ Error processing {doc_id}: {e}")
            return {
                "id": doc_id,
                "status": "error",
                "error": str(e)
            }
    
    def analyze_batch_results(self, results: List[Dict]):
        """Analyze and report batch results."""
        total = len(results)
        successful = sum(1 for r in results if r.get('status') == 'success')
        blocked = sum(1 for r in results if r.get('should_block', False))
        errors = sum(1 for r in results if r.get('status') == 'error')
        
        avg_time = sum(
            r.get('processing_time_ms', 0) for r in results if r.get('status') == 'success'
        ) / successful if successful > 0 else 0
        
        print(f"\n{'='*60}")
        print(f"BATCH PROCESSING RESULTS")
        print(f"{'='*60}")
        print(f"Total documents: {total}")
        print(f"Successful: {successful}")
        print(f"Blocked: {blocked}")
        print(f"Errors: {errors}")
        print(f"Average processing time: {avg_time:.1f}ms")
        print(f"{'='*60}\n")
    
    def shutdown(self):
        """Clean up resources."""
        self.integration.shutdown()

# Usage
async def main():
    # Create sample documents
    documents = [
        {
            "id": "doc1",
            "content": "Water boils at 100 degrees Celsius at sea level."
        },
        {
            "id": "doc2",
            "content": "The Earth is approximately 4.5 billion years old."
        },
        {
            "id": "doc3",
            "content": "Photosynthesis converts light energy into chemical energy."
        },
        {
            "id": "doc4",
            "content": "The speed of light is 299,792,458 meters per second."
        },
        {
            "id": "doc5",
            "content": "DNA contains the genetic instructions for all living organisms."
        }
    ]
    
    # Process batch
    pipeline = BatchFactCheckingPipeline(
        project_path=Path("./batch_project"),
        max_concurrent=3
    )
    
    results = await pipeline.process_batch(documents)
    
    # Review blocked documents
    blocked_docs = [r for r in results if r.get('should_block', False)]
    if blocked_docs:
        print(f"\n⚠️ {len(blocked_docs)} document(s) blocked:")
        for doc in blocked_docs:
            print(f"  - {doc['id']}")
    
    pipeline.shutdown()

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Additional Resources

### Documentation

- **API Reference**: [API_REFERENCE.md](API_REFERENCE.md) - Complete API documentation
- **User Guide**: [USER_GUIDE.md](USER_GUIDE.md) - Getting started and usage examples
- **Design Document**: [.kiro/specs/fact-checking-system/design.md](../.kiro/specs/fact-checking-system/design.md) - System architecture
- **Requirements**: [.kiro/specs/fact-checking-system/requirements.md](../.kiro/specs/fact-checking-system/requirements.md) - Detailed requirements

### Code Examples

- **Pipeline Integration**: `examples/pipeline_integration_example.py`
- **Basic Usage**: `examples/basic_usage_example.py`
- **Advanced Patterns**: `examples/advanced_integration_example.py`

### Testing

- **Integration Tests**: `tests/test_pipeline_integration.py`
- **Unit Tests**: `tests/test_fact_checker_command.py`
- **Property Tests**: `tests/test_*_properties.py`

### Support

For issues, questions, or contributions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review existing documentation
3. Check test files for usage examples
4. Consult the design document for architecture details

---

## Summary

This integration guide has covered:

✅ **Pipeline Integration Setup** - Step-by-step setup instructions  
✅ **Hook Configuration** - Detailed configuration options and examples  
✅ **Integration Patterns** - Common patterns for different use cases  
✅ **Best Practices** - Production-ready recommendations  
✅ **Advanced Topics** - Custom handlers, dynamic configuration, multi-project support  
✅ **Troubleshooting** - Common issues and solutions  
✅ **Examples** - Complete working examples for various scenarios

The fact-checking system is now ready for integration with your StoryCore pipeline. Start with the basic integration example and gradually adopt more advanced patterns as needed.

For production deployments, follow the best practices section and use the production integration example as a template.

