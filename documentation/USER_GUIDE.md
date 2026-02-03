# Fact-Checking System User Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Using the /fact_checker Command](#using-the-fact_checker-command)
3. [Configuration Guide](#configuration-guide)
4. [Pipeline Integration](#pipeline-integration)
5. [Troubleshooting](#troubleshooting)
6. [Best Practices](#best-practices)
7. [Examples](#examples)

---

## Getting Started

### What is the Fact-Checking System?

The Scientific Fact-Checking & Multimedia Anti-Fake System is a modular add-on for StoryCore-Engine that provides automated verification capabilities for text content and video transcripts. It helps you:

- **Verify factual claims** in scripts and documents
- **Detect manipulation signals** in video transcripts
- **Assess content integrity** before publication
- **Generate detailed reports** with evidence and recommendations

### Prerequisites

**Required:**
- Python 3.9 or higher
- StoryCore-Engine installation

**Dependencies:**
The system uses standard Python libraries and minimal external dependencies:
```bash
pip install jsonschema>=4.17.0
```

### Quick Installation

1. **Verify Installation**
   ```bash
   python -c "from src.fact_checker import FactCheckerCommand; print('✓ Fact-checking system installed')"
   ```

2. **Test Basic Functionality**
   ```python
   from src.fact_checker import FactCheckerCommand
   
   command = FactCheckerCommand()
   result = command.execute("Water boils at 100°C at sea level")
   print(result['status'])  # Should print: success
   ```

### System Architecture

The fact-checking system consists of three main components:


```
┌─────────────────────────────────────────────────────────────┐
│                    Fact Checker Command                      │
│                     (/fact_checker)                          │
└────────────┬────────────────────────────────┬───────────────┘
             │                                │
             ▼                                ▼
┌────────────────────────┐      ┌────────────────────────────┐
│  Scientific Audit      │      │  Anti-Fake Video Analysis  │
│  Agent (Text)          │      │  Agent (Transcript)        │
│                        │      │                            │
│  - Claim Extraction    │      │  - Manipulation Detection  │
│  - Domain Routing      │      │  - Coherence Analysis      │
│  - Evidence Retrieval  │      │  - Integrity Scoring       │
│  - Confidence Scoring  │      │  - Risk Assessment         │
└────────────────────────┘      └────────────────────────────┘
```

---

## Using the /fact_checker Command

### Basic Usage

The `/fact_checker` command is your primary interface to the fact-checking system. It provides a unified way to verify both text content and video transcripts.

#### Python API

```python
from src.fact_checker import FactCheckerCommand

# Create command instance
command = FactCheckerCommand()

# Verify text content
result = command.execute("Your content here")

# Check result
if result['status'] == 'success':
    print(f"Verification complete!")
    print(f"Mode: {result['mode']}")
    print(f"Summary: {result['summary']}")
else:
    print(f"Error: {result['error']['message']}")
```

### Command Parameters

The `execute()` method accepts the following parameters:


| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `input_data` | str or Path | *required* | Content to verify (string or file path) |
| `mode` | str | `"auto"` | Verification mode: `"text"`, `"video"`, or `"auto"` |
| `confidence_threshold` | float | `70.0` | Minimum confidence score (0-100) |
| `detail_level` | str | `"detailed"` | Output detail: `"summary"`, `"detailed"`, or `"full"` |
| `output_format` | str | `"json"` | Output format: `"json"`, `"markdown"`, or `"pdf"` |
| `cache` | bool | `True` | Enable result caching |

### Verification Modes

#### 1. Auto Mode (Recommended)

Automatically detects whether content is text or video transcript:

```python
result = command.execute("Your content here", mode="auto")
```

**Auto-detection uses:**
- Timestamp patterns: `[00:10:30]`, `00:10:30`, etc.
- Transcript keywords: "transcript", "speaker:", "[music]"
- Structural patterns typical of transcripts

#### 2. Text Mode

Forces text analysis using the Scientific Audit Agent:

```python
result = command.execute(
    "Water boils at 100°C at sea level",
    mode="text"
)
```

**Best for:**
- Scripts and documents
- Scientific content
- Factual articles
- Research papers

#### 3. Video Mode

Forces transcript analysis using the Anti-Fake Video Agent:

```python
result = command.execute(
    "[00:00:10] Speaker: Climate change is a hoax...",
    mode="video"
)
```

**Best for:**
- Video transcripts
- Interview transcripts
- Documentary scripts
- Multimedia content


### Input Options

#### String Input

Pass content directly as a string:

```python
content = """
The Earth orbits the Sun at an average distance of 93 million miles.
This distance is called an astronomical unit (AU).
"""

result = command.execute(content)
```

#### File Input

Pass a file path to read content from a file:

```python
from pathlib import Path

result = command.execute(Path("script.txt"))
# or
result = command.execute("script.txt")
```

**Supported file types:**
- `.txt` - Plain text files
- `.json` - JSON files (content extracted automatically)

### Output Formats

#### JSON Format (Default)

Returns structured data for programmatic processing:

```python
result = command.execute(content, output_format="json")

# Access structured data
report = result['report']
claims = report['claims']
for claim in claims:
    print(f"Claim: {claim['text']}")
    print(f"Confidence: {claim['confidence']}")
    print(f"Risk: {claim['risk_level']}")
```

#### Markdown Format

Returns human-readable markdown report:

```python
result = command.execute(content, output_format="markdown")

# Save to file
with open("report.md", "w") as f:
    f.write(result['report'])
```

#### PDF Format

Returns PDF report as bytes:

```python
result = command.execute(content, output_format="pdf")

# Save to file
with open("report.pdf", "wb") as f:
    f.write(result['report'])
```


### Detail Levels

Control the amount of information in the output:

#### Summary Level

Returns only high-level statistics and summary:

```python
result = command.execute(content, detail_level="summary")

# Output includes:
# - Summary statistics (total claims, high-risk count, average confidence)
# - Human-readable summary
# - No detailed claim-by-claim analysis
```

#### Detailed Level (Default)

Returns standard level of detail:

```python
result = command.execute(content, detail_level="detailed")

# Output includes:
# - All claims with confidence scores
# - Risk levels and recommendations
# - Key evidence excerpts
# - Summary statistics
```

#### Full Level

Returns maximum detail including all evidence:

```python
result = command.execute(content, detail_level="full")

# Output includes:
# - Everything from detailed level
# - Complete evidence details
# - All source information
# - Extended metadata
```

### Understanding Results

#### Response Structure

Every successful verification returns this structure:

```python
{
    "status": "success",           # "success" or "error"
    "mode": "text",                # Mode used: "text" or "video"
    "agent": "scientific_audit",   # Agent used
    "report": { ... },             # Detailed report (format varies)
    "summary": "...",              # Human-readable summary
    "processing_time_ms": 1234,    # Processing time
    "cached": false                # Whether result was cached
}
```


#### Report Structure (Text Mode)

For text analysis, the report contains:

```python
{
    "metadata": {
        "timestamp": "2024-01-15T10:30:00Z",
        "version": "1.0",
        "input_hash": "sha256:...",
        "processing_time_ms": 1234
    },
    "claims": [
        {
            "id": "claim-001",
            "text": "Water boils at 100°C",
            "domain": "physics",
            "confidence": 95.0,
            "risk_level": "low",
            "evidence": [
                {
                    "source": "Encyclopedia Britannica",
                    "relevance": 98.0,
                    "excerpt": "Water boils at 100°C at sea level..."
                }
            ],
            "recommendation": "Claim verified with high confidence"
        }
    ],
    "summary_statistics": {
        "total_claims": 5,
        "high_risk_count": 0,
        "average_confidence": 87.5,
        "domains_analyzed": ["physics", "biology"]
    }
}
```

#### Report Structure (Video Mode)

For video transcript analysis, the report contains:

```python
{
    "metadata": { ... },
    "manipulation_signals": [
        {
            "type": "emotional_manipulation",
            "severity": "medium",
            "timestamp_start": "00:05:30",
            "timestamp_end": "00:06:15",
            "description": "Use of fear-based language...",
            "evidence": "Specific phrases detected...",
            "confidence": 75.0
        }
    ],
    "coherence_score": 65.0,
    "integrity_score": 70.0,
    "risk_level": "medium",
    "problematic_segments": [
        {
            "timestamp": "00:05:30",
            "issue": "Emotional manipulation detected",
            "recommendation": "Review segment for bias"
        }
    ]
}
```


#### Risk Levels

The system assigns risk levels based on confidence scores:

| Risk Level | Confidence Range | Meaning |
|------------|------------------|---------|
| **Low** | 70-100 | High confidence, minimal risk |
| **Medium** | 50-70 | Moderate confidence, some concerns |
| **High** | 30-50 | Low confidence, significant concerns |
| **Critical** | 0-30 | Very low confidence, major concerns |

**Note:** Risk level mappings can be customized in configuration.

---

## Configuration Guide

### Configuration File

Create a `fact_checker_config.json` file to customize system behavior:

```json
{
  "confidence_threshold": 70.0,
  "risk_level_mappings": {
    "critical": [0, 30],
    "high": [30, 50],
    "medium": [50, 70],
    "low": [70, 100]
  },
  "trusted_sources": {
    "physics": [
      "Encyclopedia Britannica",
      "Nature Physics",
      "Physical Review"
    ],
    "biology": [
      "Nature",
      "Science",
      "Cell"
    ]
  },
  "custom_domains": [
    "climate_science",
    "economics"
  ],
  "cache_enabled": true,
  "cache_ttl_seconds": 86400,
  "max_concurrent_verifications": 5,
  "timeout_seconds": 60
}
```

### Configuration Options

#### Core Settings

**confidence_threshold** (float, default: 70.0)
- Minimum confidence score for claims to be considered verified
- Range: 0-100
- Lower values are more permissive, higher values are stricter

```json
{
  "confidence_threshold": 80.0
}
```


**risk_level_mappings** (object, default: see above)
- Maps confidence score ranges to risk levels
- Each level has [min, max] confidence range
- Must cover full 0-100 range without gaps

```json
{
  "risk_level_mappings": {
    "critical": [0, 40],
    "high": [40, 60],
    "medium": [60, 80],
    "low": [80, 100]
  }
}
```

#### Source Configuration

**trusted_sources** (object, default: {})
- Domain-specific lists of trusted sources
- Used for evidence retrieval and credibility scoring
- Supports custom domains

```json
{
  "trusted_sources": {
    "physics": ["Nature Physics", "Physical Review"],
    "history": ["Smithsonian", "History.com"],
    "custom_domain": ["Custom Source 1", "Custom Source 2"]
  }
}
```

**custom_domains** (array, default: [])
- Additional domain classifications beyond built-in ones
- Built-in domains: physics, biology, history, statistics, general

```json
{
  "custom_domains": [
    "climate_science",
    "economics",
    "psychology"
  ]
}
```

#### Performance Settings

**cache_enabled** (boolean, default: true)
- Enable/disable result caching
- Cached results are retrieved instantly
- Cache key is based on content hash

```json
{
  "cache_enabled": true
}
```

**cache_ttl_seconds** (integer, default: 86400)
- Time-to-live for cached results in seconds
- Default: 86400 (24 hours)
- Set to 0 for no expiration

```json
{
  "cache_ttl_seconds": 3600
}
```


**max_concurrent_verifications** (integer, default: 5)
- Maximum number of concurrent verification operations
- Used for batch processing
- Higher values increase throughput but use more resources

```json
{
  "max_concurrent_verifications": 10
}
```

**timeout_seconds** (integer, default: 60)
- Maximum time for a single verification operation
- Operations exceeding this time will be terminated
- Increase for very large documents

```json
{
  "timeout_seconds": 120
}
```

### Loading Configuration

#### Automatic Discovery

The system automatically searches for configuration files in:

1. Current directory: `./fact_checker_config.json`
2. Project root: `../fact_checker_config.json`
3. User config: `~/.config/fact_checker/fact_checker_config.json`

```python
from src.fact_checker import FactCheckerCommand

# Automatically loads config from standard locations
command = FactCheckerCommand()
```

#### Explicit Path

Specify a configuration file path:

```python
from src.fact_checker.configuration import load_config
from src.fact_checker import FactCheckerCommand

# Load specific config file
config = load_config("path/to/config.json")

# Create command with config
command = FactCheckerCommand(config)
```

#### Programmatic Configuration

Create configuration programmatically:

```python
from src.fact_checker.models import Configuration
from src.fact_checker import FactCheckerCommand

config = Configuration(
    confidence_threshold=80.0,
    cache_enabled=True,
    timeout_seconds=120
)

command = FactCheckerCommand(config)
```


### Environment-Specific Configuration

Support different settings for development, testing, and production:

```json
{
  "confidence_threshold": 70.0,
  "cache_enabled": true,
  
  "environments": {
    "development": {
      "confidence_threshold": 50.0,
      "cache_enabled": false,
      "timeout_seconds": 300
    },
    "production": {
      "confidence_threshold": 80.0,
      "cache_enabled": true,
      "timeout_seconds": 60
    }
  }
}
```

Set environment via environment variable:

```bash
export FACT_CHECKER_ENV=development
python your_script.py
```

Or programmatically:

```python
from src.fact_checker.configuration import get_config_manager

manager = get_config_manager(environment="development")
config = manager.load_config()
```

### Configuration Validation

The system validates all configuration settings and uses safe defaults for invalid values:

```python
# Invalid configuration
{
  "confidence_threshold": 150,  # Out of range
  "cache_ttl_seconds": "invalid"  # Wrong type
}

# System behavior:
# - Logs warning: "confidence_threshold: Value 150 out of range [0, 100]. Using default: 70"
# - Logs warning: "cache_ttl_seconds: Expected integer, got str. Using default: 86400"
# - Continues with default values
```

---

## Pipeline Integration

The fact-checking system integrates seamlessly with StoryCore-Engine's pipeline through hooks at key stages.

### Integration Points


1. **before_generate** - Validate input scripts before generation
2. **after_generate** - Verify generated content
3. **on_publish** - Final validation before publication

### Basic Integration

```python
import asyncio
from pathlib import Path
from src.fact_checker.pipeline_integration import PipelineIntegration

async def main():
    # Create integration instance
    integration = PipelineIntegration(
        project_path=Path("./my_project")
    )
    
    # Execute hook
    content = "Your content to verify..."
    result = await integration.execute_hook("before_generate", content)
    
    print(f"Status: {result.status}")
    print(f"Should block: {result.should_block}")
    
    integration.shutdown()

asyncio.run(main())
```

### Hook Configuration

Configure each hook independently:

```python
from src.fact_checker.pipeline_integration import HookConfig

integration.configure_hook(
    "before_generate",
    HookConfig(
        enabled=True,
        mode="auto",
        blocking=False,
        on_high_risk="warn"
    )
)

integration.configure_hook(
    "on_publish",
    HookConfig(
        enabled=True,
        mode="auto",
        blocking=True,
        on_high_risk="block"
    )
)
```

### Warning Events

Register callbacks for high-risk content detection:

```python
def handle_warning(event):
    print(f"⚠️  Warning: {event['summary']}")
    print(f"   Risk Level: {event['risk_level']}")
    # Send notification, log to monitoring, etc.

integration.register_event_callback("warning", handle_warning)
```

For complete pipeline integration documentation, see [PIPELINE_INTEGRATION_GUIDE.md](../src/fact_checker/PIPELINE_INTEGRATION_GUIDE.md).

---


## Troubleshooting

### Common Issues

#### Issue: "Input content cannot be empty"

**Cause:** Empty or whitespace-only input provided

**Solution:**
```python
# Check content before verification
content = "Your content here"
if content and content.strip():
    result = command.execute(content)
else:
    print("Content is empty")
```

#### Issue: "Input file not found"

**Cause:** File path doesn't exist or is incorrect

**Solution:**
```python
from pathlib import Path

file_path = Path("script.txt")
if file_path.exists():
    result = command.execute(file_path)
else:
    print(f"File not found: {file_path}")
```

#### Issue: "Confidence threshold must be between 0 and 100"

**Cause:** Invalid confidence threshold parameter

**Solution:**
```python
# Ensure threshold is in valid range
threshold = 75.0
if 0 <= threshold <= 100:
    result = command.execute(content, confidence_threshold=threshold)
```

#### Issue: Configuration not loading

**Cause:** Invalid JSON or configuration file not found

**Solution:**
1. Validate JSON syntax using a JSON validator
2. Check file location (see Configuration Guide)
3. Review logs for specific validation errors

```python
import logging
logging.basicConfig(level=logging.INFO)

# Logs will show configuration issues
from src.fact_checker.configuration import load_config
config = load_config("config.json")
```


#### Issue: Slow verification performance

**Cause:** Large documents, disabled caching, or network issues

**Solutions:**

1. **Enable caching:**
```python
config = Configuration(cache_enabled=True)
command = FactCheckerCommand(config)
```

2. **Increase timeout for large documents:**
```python
config = Configuration(timeout_seconds=120)
command = FactCheckerCommand(config)
```

3. **Use summary detail level for faster results:**
```python
result = command.execute(content, detail_level="summary")
```

#### Issue: Auto-detection choosing wrong mode

**Cause:** Content lacks clear indicators for automatic detection

**Solution:** Explicitly specify the mode:
```python
# Force text mode
result = command.execute(content, mode="text")

# Force video mode
result = command.execute(content, mode="video")
```

#### Issue: High-risk false positives

**Cause:** Confidence threshold too high or risk mappings too strict

**Solution:** Adjust configuration:
```json
{
  "confidence_threshold": 60.0,
  "risk_level_mappings": {
    "critical": [0, 20],
    "high": [20, 40],
    "medium": [40, 60],
    "low": [60, 100]
  }
}
```

### Error Messages

#### Processing Errors

**Error:** `"PROCESSING_ERROR"`

**Meaning:** Internal error during verification

**Actions:**
1. Check input content for unusual characters or formatting
2. Verify system resources (memory, disk space)
3. Review logs for detailed error information
4. Try with smaller content sample


#### Validation Errors

**Error:** `"VALIDATION_ERROR"`

**Meaning:** Input doesn't meet validation requirements

**Actions:**
1. Check error details in response
2. Verify input format matches expectations
3. Ensure all required fields are present

```python
result = command.execute(content)
if result['status'] == 'error':
    print(f"Error: {result['error']['message']}")
    if 'details' in result['error']:
        for detail in result['error']['details']:
            print(f"  - {detail['field']}: {detail['issue']}")
```

### Debugging Tips

#### Enable Detailed Logging

```python
import logging

# Set up logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Run verification
result = command.execute(content)
```

#### Inspect Agent Statistics

```python
command = FactCheckerCommand()

# Get statistics
stats = command.get_statistics()
print(f"Command version: {stats['command_version']}")
print(f"Supported modes: {stats['supported_modes']}")
print(f"Scientific agent stats: {stats['scientific_agent']}")
print(f"Video agent stats: {stats['video_agent']}")
```

#### Test with Known Content

```python
# Test with simple, known-good content
test_content = "Water boils at 100 degrees Celsius at sea level."
result = command.execute(test_content, mode="text")

if result['status'] == 'success':
    print("✓ System working correctly")
else:
    print("✗ System issue detected")
    print(result['error'])
```


### Getting Help

If you encounter issues not covered here:

1. **Check the API Reference:** See [API_REFERENCE.md](API_REFERENCE.md) for detailed API documentation
2. **Review Examples:** See the [Examples](#examples) section below
3. **Check Logs:** Enable debug logging to see detailed execution information
4. **Consult Design Document:** See `.kiro/specs/fact-checking-system/design.md` for system architecture

---

## Best Practices

### Content Preparation

#### 1. Clean Input Text

Remove unnecessary formatting and ensure proper encoding:

```python
# Clean content before verification
content = content.strip()
content = content.replace('\r\n', '\n')  # Normalize line endings
content = ' '.join(content.split())  # Normalize whitespace

result = command.execute(content)
```

#### 2. Provide Context

Include relevant context for better claim extraction:

```python
# Good: Includes context
content = """
In physics, water has a boiling point of 100°C at standard atmospheric 
pressure (1 atm or 101.325 kPa). This is at sea level.
"""

# Less ideal: Lacks context
content = "Water boils at 100°C"
```

#### 3. Structure Video Transcripts

Use consistent timestamp formatting:

```python
# Recommended format
transcript = """
[00:00:10] Speaker: Welcome to our documentary on climate science.
[00:00:25] Narrator: The Earth's temperature has risen by 1.1°C since 1880.
[00:01:00] Expert: This warming is primarily caused by human activities.
"""
```


### Configuration Best Practices

#### 1. Environment-Specific Settings

Use different configurations for different environments:

```json
{
  "environments": {
    "development": {
      "confidence_threshold": 50.0,
      "cache_enabled": false
    },
    "production": {
      "confidence_threshold": 80.0,
      "cache_enabled": true
    }
  }
}
```

#### 2. Domain-Specific Sources

Configure trusted sources for your specific domains:

```json
{
  "trusted_sources": {
    "climate_science": [
      "IPCC Reports",
      "Nature Climate Change",
      "NASA Climate"
    ],
    "medical": [
      "WHO",
      "CDC",
      "The Lancet"
    ]
  }
}
```

#### 3. Adjust Thresholds Based on Use Case

**Strict verification (journalism, research):**
```json
{
  "confidence_threshold": 85.0,
  "risk_level_mappings": {
    "critical": [0, 40],
    "high": [40, 70],
    "medium": [70, 85],
    "low": [85, 100]
  }
}
```

**Permissive verification (creative content):**
```json
{
  "confidence_threshold": 60.0,
  "risk_level_mappings": {
    "critical": [0, 30],
    "high": [30, 45],
    "medium": [45, 60],
    "low": [60, 100]
  }
}
```


### Performance Optimization

#### 1. Enable Caching

Always enable caching for repeated content:

```python
config = Configuration(
    cache_enabled=True,
    cache_ttl_seconds=86400  # 24 hours
)
```

#### 2. Use Appropriate Detail Levels

Choose detail level based on your needs:

```python
# Quick overview
result = command.execute(content, detail_level="summary")

# Standard analysis
result = command.execute(content, detail_level="detailed")

# Deep dive (slower)
result = command.execute(content, detail_level="full")
```

#### 3. Batch Processing

For multiple documents, use batch processing:

```python
from src.fact_checker.batch_processing import BatchProcessor

processor = BatchProcessor(config)
documents = ["doc1.txt", "doc2.txt", "doc3.txt"]

results = await processor.process_batch(documents)
```

### Safety and Ethics

#### 1. Review Automated Results

Always review automated verification results:

```python
result = command.execute(content)

# Check for high-risk claims
report = result['report']
high_risk_claims = [
    c for c in report['claims'] 
    if c['risk_level'] in ['high', 'critical']
]

if high_risk_claims:
    print("⚠️  Manual review recommended")
    for claim in high_risk_claims:
        print(f"  - {claim['text']}")
        print(f"    Confidence: {claim['confidence']}")
```

#### 2. Understand System Limitations

The system has built-in safety constraints:

- **Does NOT** attribute intentions or motivations
- **Does NOT** make political judgments
- **Does NOT** provide medical diagnoses
- **Does NOT** generate fabricated sources

Always include the disclaimer in published reports.


#### 3. Handle Uncertainty Appropriately

When confidence is low, acknowledge uncertainty:

```python
result = command.execute(content)

for claim in result['report']['claims']:
    if claim['confidence'] < 70:
        print(f"⚠️  Uncertain: {claim['text']}")
        print(f"   Recommendation: {claim['recommendation']}")
```

---

## Examples

### Example 1: Basic Text Verification

```python
from src.fact_checker import FactCheckerCommand

# Create command
command = FactCheckerCommand()

# Content to verify
content = """
The Earth orbits the Sun at an average distance of 93 million miles.
This distance is called an astronomical unit (AU). The Earth completes
one orbit around the Sun in approximately 365.25 days.
"""

# Execute verification
result = command.execute(content, mode="text")

# Display results
print(f"Status: {result['status']}")
print(f"Mode: {result['mode']}")
print(f"\nSummary:")
print(result['summary'])

# Check for high-risk claims
report = result['report']
stats = report['summary_statistics']
print(f"\nStatistics:")
print(f"  Total claims: {stats['total_claims']}")
print(f"  High-risk claims: {stats['high_risk_count']}")
print(f"  Average confidence: {stats['average_confidence']:.1f}%")
```

**Expected Output:**
```
Status: success
Mode: text

Summary:
Analysis of 3 factual claims found high confidence in astronomical facts.
All claims verified against trusted sources with average confidence of 92%.
No high-risk claims detected.

Statistics:
  Total claims: 3
  High-risk claims: 0
  Average confidence: 92.0%
```


### Example 2: Video Transcript Analysis

```python
from src.fact_checker import FactCheckerCommand

command = FactCheckerCommand()

# Video transcript with timestamps
transcript = """
[00:00:10] Narrator: Welcome to our documentary on climate change.

[00:00:25] Expert: The Earth's average temperature has increased by 
1.1 degrees Celsius since the pre-industrial era.

[00:01:00] Narrator: This warming is causing devastating effects worldwide,
with scientists predicting catastrophic consequences if we don't act now!

[00:01:30] Expert: The primary cause is the increase in greenhouse gases
from human activities, particularly carbon dioxide emissions.
"""

# Analyze transcript
result = command.execute(transcript, mode="video")

# Display manipulation signals
print("Manipulation Analysis:")
for signal in result['report']['manipulation_signals']:
    print(f"\n  Type: {signal['type']}")
    print(f"  Severity: {signal['severity']}")
    print(f"  Timestamp: {signal['timestamp_start']} - {signal['timestamp_end']}")
    print(f"  Description: {signal['description']}")

# Display integrity scores
print(f"\nIntegrity Scores:")
print(f"  Coherence: {result['report']['coherence_score']}/100")
print(f"  Integrity: {result['report']['integrity_score']}/100")
print(f"  Risk Level: {result['report']['risk_level']}")
```

### Example 3: File-Based Verification

```python
from pathlib import Path
from src.fact_checker import FactCheckerCommand

command = FactCheckerCommand()

# Verify content from file
script_file = Path("documentary_script.txt")

if script_file.exists():
    result = command.execute(script_file, mode="auto")
    
    # Save report to markdown
    report_md = command.execute(
        script_file,
        mode="auto",
        output_format="markdown"
    )
    
    # Save to file
    output_file = Path("verification_report.md")
    with open(output_file, "w") as f:
        f.write(report_md['report'])
    
    print(f"✓ Report saved to {output_file}")
else:
    print(f"✗ File not found: {script_file}")
```


### Example 4: Custom Configuration

```python
from src.fact_checker.models import Configuration
from src.fact_checker import FactCheckerCommand

# Create custom configuration
config = Configuration(
    confidence_threshold=85.0,
    risk_level_mappings={
        "critical": (0, 40),
        "high": (40, 70),
        "medium": (70, 85),
        "low": (85, 100)
    },
    trusted_sources={
        "physics": [
            "Nature Physics",
            "Physical Review Letters",
            "American Physical Society"
        ]
    },
    cache_enabled=True,
    timeout_seconds=120
)

# Create command with custom config
command = FactCheckerCommand(config)

# Verify with strict settings
content = "The speed of light is 299,792,458 meters per second in vacuum."
result = command.execute(content, mode="text")

print(f"Confidence threshold: {config.confidence_threshold}")
print(f"Result: {result['summary']}")
```

### Example 5: Batch Processing

```python
import asyncio
from pathlib import Path
from src.fact_checker.batch_processing import BatchProcessor
from src.fact_checker.models import Configuration

async def verify_multiple_documents():
    # Create batch processor
    config = Configuration(max_concurrent_verifications=3)
    processor = BatchProcessor(config)
    
    # List of documents to verify
    documents = [
        "script1.txt",
        "script2.txt",
        "script3.txt",
        "transcript1.txt"
    ]
    
    # Process batch
    print("Processing batch...")
    results = await processor.process_batch(documents)
    
    # Display results
    for doc, result in zip(documents, results):
        print(f"\n{doc}:")
        if result['status'] == 'success':
            stats = result['report']['summary_statistics']
            print(f"  ✓ {stats['total_claims']} claims analyzed")
            print(f"  ✓ {stats['high_risk_count']} high-risk claims")
        else:
            print(f"  ✗ Error: {result['error']['message']}")

# Run batch processing
asyncio.run(verify_multiple_documents())
```


### Example 6: Pipeline Integration

```python
import asyncio
from pathlib import Path
from src.fact_checker.pipeline_integration import (
    PipelineIntegration,
    HookConfig
)

async def integrate_with_pipeline():
    # Create integration
    integration = PipelineIntegration(
        project_path=Path("./my_project")
    )
    
    # Configure hooks
    integration.configure_hook(
        "before_generate",
        HookConfig(
            enabled=True,
            mode="auto",
            blocking=False,
            on_high_risk="warn"
        )
    )
    
    integration.configure_hook(
        "on_publish",
        HookConfig(
            enabled=True,
            mode="auto",
            blocking=True,
            on_high_risk="block"
        )
    )
    
    # Register warning callback
    def handle_warning(event):
        print(f"⚠️  High-risk content detected!")
        print(f"   Risk: {event['risk_level']}")
        print(f"   Summary: {event['summary']}")
    
    integration.register_event_callback("warning", handle_warning)
    
    # Execute hooks
    script_content = "Your script content here..."
    
    # Before generation (non-blocking)
    result = await integration.execute_hook("before_generate", script_content)
    print(f"Before generate: {result.status}")
    
    # ... generation happens ...
    
    # On publish (blocking)
    result = await integration.execute_hook("on_publish", script_content)
    
    if result.should_block:
        print("❌ Publication blocked due to high-risk content")
    else:
        print("✅ Content approved for publication")
    
    integration.shutdown()

asyncio.run(integrate_with_pipeline())
```


### Example 7: Error Handling

```python
from src.fact_checker import FactCheckerCommand

command = FactCheckerCommand()

def verify_with_error_handling(content):
    """Verify content with comprehensive error handling."""
    try:
        # Validate input
        if not content or not content.strip():
            print("✗ Error: Content is empty")
            return None
        
        # Execute verification
        result = command.execute(content)
        
        # Check result status
        if result['status'] == 'success':
            print("✓ Verification successful")
            
            # Check for high-risk claims
            stats = result['report']['summary_statistics']
            if stats['high_risk_count'] > 0:
                print(f"⚠️  Warning: {stats['high_risk_count']} high-risk claims detected")
                
                # Display high-risk claims
                for claim in result['report']['claims']:
                    if claim['risk_level'] in ['high', 'critical']:
                        print(f"  - {claim['text']}")
                        print(f"    Confidence: {claim['confidence']:.1f}%")
                        print(f"    Recommendation: {claim['recommendation']}")
            
            return result
        
        else:
            # Handle error response
            error = result['error']
            print(f"✗ Verification failed: {error['message']}")
            
            if 'details' in error:
                print("  Details:")
                for detail in error['details']:
                    print(f"    - {detail}")
            
            return None
    
    except FileNotFoundError as e:
        print(f"✗ File not found: {e}")
        return None
    
    except ValueError as e:
        print(f"✗ Invalid input: {e}")
        return None
    
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return None

# Test with various inputs
print("Test 1: Valid content")
verify_with_error_handling("Water boils at 100°C at sea level")

print("\nTest 2: Empty content")
verify_with_error_handling("")

print("\nTest 3: File input")
verify_with_error_handling("nonexistent_file.txt")
```


---

## Quick Reference

### Command Syntax

```python
from src.fact_checker import FactCheckerCommand

command = FactCheckerCommand(config=None)

result = command.execute(
    input_data,                    # str or Path (required)
    mode="auto",                   # "text", "video", or "auto"
    confidence_threshold=None,     # float (0-100)
    detail_level="detailed",       # "summary", "detailed", or "full"
    output_format="json",          # "json", "markdown", or "pdf"
    cache=True                     # bool
)
```

### Response Structure

```python
{
    "status": "success" | "error",
    "mode": "text" | "video",
    "agent": "scientific_audit" | "antifake_video",
    "report": { ... },
    "summary": "...",
    "processing_time_ms": 1234,
    "cached": false
}
```

### Configuration File Template

```json
{
  "confidence_threshold": 70.0,
  "risk_level_mappings": {
    "critical": [0, 30],
    "high": [30, 50],
    "medium": [50, 70],
    "low": [70, 100]
  },
  "trusted_sources": {},
  "custom_domains": [],
  "cache_enabled": true,
  "cache_ttl_seconds": 86400,
  "max_concurrent_verifications": 5,
  "timeout_seconds": 60
}
```

### Common Patterns

**Basic verification:**
```python
result = command.execute("Your content")
```

**File verification:**
```python
result = command.execute(Path("file.txt"))
```

**Custom threshold:**
```python
result = command.execute(content, confidence_threshold=85.0)
```

**Markdown output:**
```python
result = command.execute(content, output_format="markdown")
```

**Force mode:**
```python
result = command.execute(content, mode="text")
```

---

## Additional Resources

- **API Reference:** [API_REFERENCE.md](API_REFERENCE.md)
- **Pipeline Integration:** [PIPELINE_INTEGRATION_GUIDE.md](../src/fact_checker/PIPELINE_INTEGRATION_GUIDE.md)
- **Design Document:** [.kiro/specs/fact-checking-system/design.md](../.kiro/specs/fact-checking-system/design.md)
- **Requirements:** [.kiro/specs/fact-checking-system/requirements.md](../.kiro/specs/fact-checking-system/requirements.md)

---

**Version:** 1.0  
**Last Updated:** 2024-01-15  
**System:** Scientific Fact-Checking & Multimedia Anti-Fake System

