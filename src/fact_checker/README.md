# Scientific Fact-Checking & Multimedia Anti-Fake System

A modular add-on for StoryCore-Engine that provides automated verification capabilities for text content and video transcripts.

## Project Structure

```
src/fact_checker/
├── __init__.py           # Package initialization
├── models.py             # Core data models (Claim, Evidence, etc.)
├── schemas.py            # JSON Schema definitions
├── validators.py         # Validation functions
└── README.md            # This file

tests/
├── __init__.py          # Test package initialization
├── conftest.py          # Pytest fixtures and configuration
├── test_models.py       # Unit tests for data models
└── test_validators.py   # Unit tests for validators
```

## Data Models

### Core Models

- **Claim**: Represents a factual claim extracted from content
- **Evidence**: Evidence supporting or contradicting a claim
- **VerificationResult**: Result of verifying a single claim
- **ManipulationSignal**: Detected manipulation signal in video transcripts
- **Report**: Complete verification report with metadata
- **Configuration**: System configuration settings

### Enums

- **DomainType**: Valid domain classifications (physics, biology, history, statistics, general)
- **RiskLevel**: Risk level classifications (low, medium, high, critical)
- **SourceType**: Types of evidence sources (academic, news, government, encyclopedia)
- **ManipulationType**: Types of manipulation signals
- **SeverityLevel**: Severity levels for manipulation signals

## Validation

All data models have corresponding JSON Schema definitions for validation:

```python
from src.fact_checker.validators import validate_claim

claim_data = {
    "id": "claim-001",
    "text": "Water boils at 100°C at sea level",
    "position": [0, 35]
}

result = validate_claim(claim_data)
if result.is_valid:
    print("Valid claim!")
else:
    print(f"Validation errors: {result.errors}")
```

## Testing

Run tests using pytest:

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src/fact_checker --cov-report=html

# Run specific test file
pytest tests/test_models.py

# Run tests with specific marker
pytest -m unit
```

## Requirements

- Python 3.9+
- jsonschema>=4.17.0
- pytest>=7.4.0 (for testing)
- hypothesis>=6.82.0 (for property-based testing)

Install requirements:

```bash
pip install -r requirements-fact-checker.txt
```

## Next Steps

This module provides the foundation for the fact-checking system. Next tasks include:

1. Implementing core internal APIs (fact extraction, domain routing, etc.)
2. Building the Scientific Audit Agent
3. Building the Anti-Fake Video Agent
4. Creating the unified command interface
5. Integrating with StoryCore pipeline

See `.kiro/specs/fact-checking-system/tasks.md` for the complete implementation plan.
