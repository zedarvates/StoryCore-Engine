# Quality Validator Implementation

## Overview

The `QualityValidator` class provides comprehensive quality validation for final video outputs, including visual coherence checking, audio quality analysis, and audio-video synchronization verification.

## Features

### 1. Visual Coherence Checking
- **Style Consistency**: Analyzes consistency of visual style across shots
- **Color Palette**: Checks color consistency throughout the video
- **Style Drift**: Detects changes in visual style from start to end
- **Frame Analysis**: Samples frames and compares visual characteristics

### 2. Audio Quality Checking
- **Clarity Analysis**: Measures audio clarity and noise levels
- **Gap Detection**: Identifies silent sections or audio gaps
- **Artifact Detection**: Finds audio artifacts or distortions
- **Dynamic Range**: Analyzes audio dynamic range

### 3. Synchronization Checking
- **Audio-Video Offset**: Measures timing offset between audio and video
- **Drift Detection**: Identifies synchronization drift over time
- **Lip Sync**: Validates lip synchronization (when applicable)

## Architecture

```
QualityValidator
├── validate_final_video()      # Main validation entry point
├── check_visual_coherence()    # Visual analysis
├── check_audio_quality()       # Audio analysis
├── check_synchronization()     # Sync analysis
└── _generate_recommendations() # Generate actionable recommendations
```

## Usage

### Basic Usage

```python
from pathlib import Path
from end_to_end.quality_validator import QualityValidator
from end_to_end.data_models import ProjectComponents

# Initialize validator
validator = QualityValidator()

# Validate video
video_path = Path("exports/my_project/final_video.mp4")
project_data = ProjectComponents(...)  # Your project data

report = await validator.validate_final_video(video_path, project_data)

# Check results
if report.passed:
    print(f"✓ Video passed quality validation!")
    print(f"Overall score: {report.overall_score:.2f}")
else:
    print(f"✗ Video failed quality validation")
    print(f"Issues found: {len(report.detected_issues)}")
    for issue in report.detected_issues:
        print(f"  - {issue.description}")
```

### Detailed Analysis

```python
# Get detailed scores
print(f"Visual Coherence: {report.visual_coherence_score:.2f}")
print(f"Audio Quality: {report.audio_quality_score:.2f}")
print(f"Synchronization: {report.sync_score:.2f}")

# Get recommendations
print("\nRecommendations:")
for rec in report.recommendations:
    print(f"  • {rec}")

# Analyze specific issues
for issue in report.detected_issues:
    print(f"\n{issue.severity.upper()}: {issue.description}")
    print(f"Category: {issue.category}")
    print(f"Location: {issue.location}")
```

### Custom Thresholds

```python
# Create validator with custom thresholds
validator = QualityValidator()
validator.min_visual_coherence = 0.8  # Stricter visual requirements
validator.min_audio_quality = 0.7     # Stricter audio requirements
validator.min_sync_score = 0.9        # Stricter sync requirements
validator.max_sync_offset = 50        # Tighter sync tolerance (ms)

report = await validator.validate_final_video(video_path, project_data)
```

## Quality Metrics

### Visual Coherence Score (0.0 - 1.0)
- **1.0**: Perfect visual consistency across all shots
- **0.8-0.9**: Excellent consistency with minor variations
- **0.7-0.8**: Good consistency (default threshold)
- **0.5-0.7**: Moderate consistency with noticeable variations
- **< 0.5**: Poor consistency, significant style drift

### Audio Quality Score (0.0 - 1.0)
- **1.0**: Perfect audio quality
- **0.8-0.9**: Excellent quality with minimal noise
- **0.6-0.8**: Good quality (default threshold)
- **0.4-0.6**: Acceptable quality with some issues
- **< 0.4**: Poor quality with significant issues

### Synchronization Score (0.0 - 1.0)
- **1.0**: Perfect synchronization
- **0.9-1.0**: Excellent sync (default threshold)
- **0.8-0.9**: Good sync with minor offset
- **0.6-0.8**: Acceptable sync with noticeable offset
- **< 0.6**: Poor sync, significant offset

## Quality Report Structure

```python
@dataclass
class QualityReport:
    overall_score: float              # Weighted average of all scores
    visual_coherence_score: float     # Visual consistency score
    audio_quality_score: float        # Audio quality score
    sync_score: float                 # Synchronization score
    detected_issues: List[Issue]      # List of detected issues
    recommendations: List[str]        # Actionable recommendations
    passed: bool                      # Overall pass/fail status
```

### Issue Structure

```python
@dataclass
class Issue:
    issue_id: str        # Unique issue identifier (e.g., "V001", "A002")
    severity: str        # "critical", "high", "medium", "low"
    category: str        # "visual_coherence", "audio_quality", "synchronization"
    description: str     # Human-readable description
    location: str        # Where the issue occurs
```

## Implementation Details

### Visual Analysis (with OpenCV)

When OpenCV is available, the validator:
1. Samples frames uniformly across the video
2. Calculates color histograms for each frame
3. Compares consecutive frames for consistency
4. Measures style drift from start to end
5. Computes overall coherence score

### Visual Analysis (fallback)

When OpenCV is not available:
- Performs basic file size checks
- Assumes reasonable quality if file exists
- Returns conservative scores

### Audio Analysis (with librosa)

When librosa is available, the validator:
1. Loads audio from video file
2. Calculates RMS energy across time
3. Detects silent sections (gaps)
4. Measures dynamic range
5. Estimates noise levels
6. Detects sudden spikes (artifacts)

### Audio Analysis (fallback)

When librosa is not available:
- Returns conservative default scores
- Assumes no gaps or artifacts

### Synchronization Analysis

The validator checks:
- Audio-video timing offset
- Drift over the duration of the video
- Frame rate consistency

## Dependencies

### Required
- Python 3.9+
- pathlib (standard library)
- logging (standard library)

### Optional (for advanced analysis)
- **OpenCV (cv2)**: For visual coherence analysis
- **librosa**: For audio quality analysis
- **numpy**: For numerical computations

Install optional dependencies:
```bash
pip install opencv-python librosa numpy
```

## Error Handling

The validator handles errors gracefully:

1. **Missing Video File**: Returns failed report with clear error message
2. **Missing Dependencies**: Falls back to basic checks with warnings
3. **Analysis Failures**: Catches exceptions and returns conservative scores
4. **Invalid Video Format**: Reports validation failure

## Performance Considerations

### Frame Sampling
- Samples maximum of 10 frames for analysis
- Reduces processing time for long videos
- Maintains accuracy through uniform sampling

### Memory Management
- Processes frames one at a time
- Releases video capture resources
- Minimal memory footprint

### Processing Time
- Visual analysis: ~2-5 seconds for typical video
- Audio analysis: ~3-7 seconds for typical video
- Synchronization: ~1-2 seconds
- **Total**: ~6-14 seconds for complete validation

## Testing

### Unit Tests
See `tests/unit/test_quality_validator.py` for:
- Visual coherence checking
- Audio quality checking
- Synchronization checking
- Report generation
- Error handling

### Property Tests
See `tests/property/test_quality_properties.py` for:
- Property 10: Final Quality Validation
- Validates Requirements 10.1-10.8

## Future Enhancements

1. **Advanced Visual Analysis**
   - Shot boundary detection
   - Scene composition analysis
   - Motion consistency checking

2. **Advanced Audio Analysis**
   - Speech quality metrics
   - Music quality analysis
   - Spatial audio validation

3. **Machine Learning Integration**
   - Learned quality metrics
   - Perceptual quality scoring
   - Automated issue classification

4. **Real-time Validation**
   - Stream-based analysis
   - Progressive quality reporting
   - Early issue detection

## References

- Requirements: 10.1-10.8 in requirements.md
- Design: Quality Validator section in design.md
- Property: Property 10 in design.md
