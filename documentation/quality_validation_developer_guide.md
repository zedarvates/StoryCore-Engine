# Quality Validation Developer Guide

## Overview

This guide provides technical documentation for developers working with the StoryCore quality validation system. It covers module APIs, integration points, and testing patterns used throughout the codebase.

## Module APIs

### QualityValidator Class

The main quality validation class providing comprehensive assessment capabilities.

#### Constructor

```python
QualityValidator(
    mode: ValidationMode = ValidationMode.BATCH,
    quality_standard: QualityStandard = QualityStandard.WEB_HD,
    enable_advanced_analysis: bool = True
)
```

**Parameters:**
- `mode`: `ValidationMode.REAL_TIME` for fast validation, `ValidationMode.BATCH` for comprehensive analysis
- `quality_standard`: Target quality standard (`PREVIEW`, `WEB_HD`, `BROADCAST`)
- `enable_advanced_analysis`: Enable advanced analysis features

#### Key Methods

##### Video Validation

```python
def validate_video_file(self, video_path: Path) -> Tuple[bool, str]:
    """Validate video file format and readability."""
    # Returns (is_valid, error_message)
```

```python
def calculate_sharpness(self, frame: np.ndarray) -> float:
    """Calculate frame sharpness using Laplacian variance."""
    # Returns sharpness score (higher = sharper)
```

```python
def detect_unnatural_movements(self, frames: List[np.ndarray]) -> List[dict]:
    """Detect motion anomalies using optical flow."""
    # Returns list of movement issues with timestamps
```

```python
def detect_visual_anomalies(self, frames: List[np.ndarray]) -> List[dict]:
    """Detect visual artifacts and inconsistencies."""
    # Returns list of visual issues
```

##### Audio Validation

```python
def validate_audio_file(self, audio_path: Path) -> Tuple[bool, str]:
    """Validate audio file format and readability."""
    # Returns (is_valid, error_message)
```

```python
def detect_metallic_voice(self, audio_clip: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Detect AI-generated voice artifacts using spectral analysis."""
    # Returns list of metallic voice issues with severity
```

```python
def measure_voice_clarity(self, audio_clip: Dict[str, Any]) -> Dict[str, Any]:
    """Measure voice clarity using SNR analysis."""
    # Returns clarity score, SNR, issues, and recommendations
```

```python
def detect_audio_gaps(self, audio_clip: Dict[str, Any],
                     silence_threshold_db: float = -40.0,
                     min_gap_duration: float = 0.1) -> List[Dict[str, Any]]:
    """Detect audio gaps and silences."""
    # Returns list of gaps with timestamps and classification
```

```python
def analyze_voice_quality(self, audio_clip: Dict[str, Any]) -> Dict[str, Any]:
    """Comprehensive voice quality analysis."""
    # Returns quality score, issues, suggestions, and metrics
```

##### Quality Scoring

```python
def generate_quality_score(self, shot: dict) -> ComprehensiveQualityScore:
    """Generate overall quality score for a video shot."""
    # Returns ComprehensiveQualityScore with breakdown
```

```python
def assess_quality(self, frames: List[List[List[int]]]) -> QualityAssessment:
    """Assess quality for a list of video frames."""
    # Returns detailed QualityAssessment
```

### Data Classes

#### QualityIssue
Represents a specific quality issue detected during validation.

```python
@dataclass
class QualityIssue:
    issue_type: str          # e.g., "low_sharpness", "metallic_voice"
    severity: str           # "low", "medium", "high", "critical"
    description: str        # Human-readable description
    timestamp: float        # Time in seconds (video) or frame number
    frame_number: Optional[int]  # Frame number for video issues
    metric_value: float     # Actual measured value
    threshold_value: float  # Threshold that was exceeded
```

#### ImprovementSuggestion
Actionable suggestion for quality improvement.

```python
@dataclass
class ImprovementSuggestion:
    suggestion_id: str      # Unique identifier
    priority: int          # 1 (highest) to 5 (lowest)
    action: str            # Human-readable action description
    parameters: dict       # Specific parameter adjustments
    expected_improvement: float  # Estimated quality score improvement
    related_issue_ids: List[str]  # Related issue identifiers
```

#### ComprehensiveQualityScore
Complete quality assessment result.

```python
@dataclass
class ComprehensiveQualityScore:
    overall_score: float    # 0-100
    sharpness_score: float  # 0-100
    motion_score: float     # 0-100
    audio_score: float      # 0-100
    continuity_score: float # 0-100
    issues: List[QualityIssue]
    suggestions: List[ImprovementSuggestion]
```

### ReportGenerator Classes

#### JSONReportGenerator

```python
class JSONReportGenerator:
    def generate_comprehensive_report(
        self,
        quality_scores: List[QualityScore],
        project_name: str = "StoryCore Project",
        generation_timestamp: Optional[float] = None
    ) -> str:
        """Generate comprehensive JSON report."""
```

#### HTMLReportGenerator

```python
class HTMLReportGenerator:
    def generate_comprehensive_report(
        self,
        quality_scores: List[QualityScore],
        project_name: str = "StoryCore Project",
        generation_timestamp: Optional[float] = None,
        include_visualizations: bool = True
    ) -> str:
        """Generate HTML report with embedded charts."""
```

## Integration Points

### CLI Integration

The quality validator integrates with the CLI through the `ValidateHandler` class:

```python
# src/cli/handlers/validate.py
from ..base import BaseHandler
from quality_validator import QualityValidator, ValidationMode

class ValidateHandler(BaseHandler):
    def execute(self, args: argparse.Namespace) -> int:
        # Parse scopes and run appropriate validations
        if "quality" in scopes:
            quality_result = self._run_quality_validation(project_path, quality_scopes, threshold)
```

### Pipeline Integration

#### Basic Quality Check Pipeline

```python
from quality_validator import QualityValidator, ValidationMode

def quality_check_pipeline(video_frames: List[np.ndarray],
                          audio_data: np.ndarray,
                          sample_rate: int) -> dict:
    """Integrated quality validation pipeline."""

    validator = QualityValidator(mode=ValidationMode.BATCH)

    # Validate video
    video_issues = []
    for i, frame in enumerate(video_frames):
        sharpness = validator.calculate_sharpness(frame)
        if sharpness < validator.sharpness_threshold:
            video_issues.append(QualityIssue(...))

    # Validate audio
    audio_clip = {'data': audio_data, 'rate': sample_rate}
    audio_result = validator.analyze_voice_quality(audio_clip)

    # Generate comprehensive score
    shot_data = {
        'frames': video_frames,
        'audio_score': audio_result['quality_score'],
        'continuity_score': 80.0  # Placeholder
    }
    quality_score = validator.generate_quality_score(shot_data)

    return {
        'passed': quality_score.passed(),
        'score': quality_score.overall_score,
        'issues': quality_score.issues,
        'suggestions': quality_score.suggestions
    }
```

#### Real-time Validation Integration

```python
# For real-time feedback during generation
validator = QualityValidator(mode=ValidationMode.REAL_TIME)

def real_time_quality_feedback(current_frames: List[np.ndarray]) -> dict:
    """Provide immediate quality feedback during content generation."""

    # Quick assessment on recent frames
    assessment = validator.assess_quality(current_frames)

    # Return immediate feedback
    return {
        'current_score': assessment.overall_score,
        'critical_issues': [i for i in assessment.detected_issues if i.severity == 'critical'],
        'can_continue': assessment.overall_score > 50.0  # Basic threshold
    }
```

### Error Handling Integration

```python
from quality_validator import QualityValidator

def robust_quality_validation(content_path: Path) -> dict:
    """Quality validation with comprehensive error handling."""

    try:
        validator = QualityValidator()

        # File validation first
        if content_path.suffix in ['.mp4', '.avi', '.mov']:
            is_valid, error = validator.validate_video_file(content_path)
            if not is_valid:
                return {'error': f'Video validation failed: {error}'}
        elif content_path.suffix in ['.wav', '.mp3']:
            is_valid, error = validator.validate_audio_file(content_path)
            if not is_valid:
                return {'error': f'Audio validation failed: {error}'}

        # Quality analysis
        # ... quality assessment code ...

    except Exception as e:
        return {'error': f'Quality validation error: {str(e)}'}
```

## Property-Based Test Patterns

The quality validation system uses property-based testing with Hypothesis to ensure robust validation logic. These tests verify universal properties that should hold for all valid inputs.

### Test Strategy Patterns

#### 1. Data Generation Strategies

```python
from hypothesis import given, strategies as st
from hypothesis.strategies import composite

@composite
def valid_audio_clip(draw):
    """Generate valid audio clips for testing."""
    sample_rate = draw(st.sampled_from([22050, 44100]))
    duration = draw(st.floats(min_value=0.01, max_value=0.1))
    length = int(sample_rate * duration)

    audio_data = draw(st.lists(
        st.floats(min_value=-1.0, max_value=1.0),
        min_size=length, max_size=length
    ))

    return {
        'data': np.array(audio_data, dtype=np.float32),
        'rate': sample_rate
    }
```

#### 2. Property Test Structure

```python
class TestQualityValidatorAudioProperties:
    @given(valid_audio_clip())
    @settings(max_examples=10, deadline=2000)
    def test_property_metallic_voice_detection(self, audio_clip):
        """Test that metallic voice detection returns valid issue data."""
        validator = QualityValidator()

        issues = validator.detect_metallic_voice(audio_clip)

        # Verify structural properties
        for issue in issues:
            assert 'issue_type' in issue
            assert 'severity' in issue
            assert issue['severity'] in ['low', 'medium', 'high']
            assert 'timestamp' in issue
            assert issue['timestamp'] >= 0.0
            assert 'metric_value' in issue
            assert issue['metric_value'] >= 0.0
```

#### 3. Invariant Testing

```python
@given(noisy_audio_clip())
def test_clarity_score_bounds(self, audio_clip):
    """Test that clarity scores are always within valid bounds."""
    validator = QualityValidator()

    result = validator.measure_voice_clarity(audio_clip)

    # Invariants that must always hold
    assert 0.0 <= result['clarity_score'] <= 100.0
    assert isinstance(result['snr'], (int, float))

    # Conditional invariants
    if result['clarity_score'] < 30.0:
        assert len(result['issues']) > 0
        assert len(result['recommendations']) > 0
```

#### 4. Edge Case Testing

```python
@given(st.lists(st.floats(min_value=-1, max_value=1), min_size=0, max_size=10))
def test_empty_audio_handling(self, audio_data):
    """Test behavior with edge case audio data."""
    validator = QualityValidator()

    audio_clip = {'data': np.array(audio_data), 'rate': 22050}
    result = validator.analyze_voice_quality(audio_clip)

    # Should handle empty or minimal data gracefully
    assert 'quality_score' in result
    assert isinstance(result['issues'], list)
```

### Test Configuration

```python
from hypothesis import settings, HealthCheck

@settings(
    max_examples=10,              # Number of test cases to generate
    deadline=2000,                # Timeout per test (ms)
    suppress_health_check=[       # Suppress warnings for:
        HealthCheck.data_too_large,  # Large generated data
        HealthCheck.too_slow        # Slow test execution
    ]
)
def test_property_example(self, data):
    # Property test implementation
    pass
```

### Common Property Patterns

#### Structural Invariants
- Return values have required fields
- Data types are correct
- Value ranges are valid
- Collections are properly formed

#### Behavioral Invariants
- Low quality always generates issues
- Critical issues have high priority suggestions
- Scores correlate with issue severity
- Recommendations include actionable parameters

#### Edge Case Handling
- Empty inputs don't crash
- Invalid data types are handled
- Boundary values work correctly
- Error conditions return appropriate responses

### Running Property Tests

```bash
# Run all quality validation property tests
pytest tests/test_quality_validator_*_properties.py -v

# Run with hypothesis statistics
pytest tests/ -k "property" --hypothesis-show-statistics

# Run specific property test
pytest tests/test_quality_validator_audio_properties.py::TestQualityValidatorAudioProperties::test_property_8_metallic_voice_detection -v
```

## Best Practices

### API Usage

1. **Choose appropriate validation mode**: Use `REAL_TIME` for live feedback, `BATCH` for comprehensive analysis
2. **Handle validation errors**: Always check file validation before quality analysis
3. **Use appropriate standards**: Match quality standards to your target audience/delivery platform
4. **Process results incrementally**: Don't load all frames into memory at once for large videos

### Testing

1. **Use property-based testing** for universal properties and edge cases
2. **Test with realistic data** including various formats, sample rates, and content types
3. **Verify error handling** for corrupted files, invalid formats, and system errors
4. **Test integration points** to ensure proper data flow between components

### Performance Considerations

1. **Mode selection**: Real-time mode uses lower quality thresholds and simplified analysis
2. **Frame sampling**: Analyze keyframes or sample frames for long videos
3. **Parallel processing**: Consider processing multiple files concurrently
4. **Memory management**: Process large files in chunks or use streaming approaches

### Error Handling

```python
try:
    validator = QualityValidator()
    is_valid, error = validator.validate_video_file(video_path)
    if not is_valid:
        logger.error(f"Video validation failed: {error}")
        return False

    # Proceed with quality analysis
    assessment = validator.assess_quality(frames)

except Exception as e:
    logger.error(f"Quality validation error: {str(e)}")
    # Return safe defaults or re-raise based on context
    raise
```

This comprehensive validation system ensures content quality through rigorous automated checking, providing actionable feedback for content improvement.