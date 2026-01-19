# Quality Validation Demo

This example project demonstrates how to use the StoryCore quality validation system to assess video and audio content quality. It includes sample media files, validation scripts, and example reports.

## Project Structure

```
quality_validation_demo/
├── README.md                    # This file
├── demo_validation.py          # Main demonstration script
├── sample_video.mp4           # Sample video file (placeholder)
├── sample_audio.wav           # Sample audio file (placeholder)
├── config.json                # Project configuration
├── reports/                   # Generated reports directory
│   ├── quality_report.json
│   ├── quality_report.html
│   └── validation_log.txt
└── scripts/
    ├── validate_video.py      # Video validation script
    ├── validate_audio.py      # Audio validation script
    └── generate_report.py     # Report generation script
```

## Quick Start

### 1. Run Complete Validation Demo

```bash
cd examples/quality_validation_demo
python demo_validation.py
```

This will:
- Validate all media files in the project
- Generate quality scores and issue reports
- Create JSON and HTML reports
- Display results in the console

### 2. Individual Component Validation

#### Video Validation Only
```bash
python scripts/validate_video.py sample_video.mp4
```

#### Audio Validation Only
```bash
python scripts/validate_audio.py sample_audio.wav
```

#### Report Generation
```bash
python scripts/generate_report.py
```

## Understanding the Results

### Quality Score Interpretation

| Score Range | Quality Level | Action Required |
|-------------|---------------|-----------------|
| 90-100 | Excellent | No action needed |
| 80-89 | Very Good | Minor improvements possible |
| 70-79 | Good | Review suggestions |
| 60-69 | Fair | Address issues |
| 50-59 | Poor | Significant rework needed |
| 0-49 | Unacceptable | Major revision required |

### Common Issues and Solutions

#### Video Issues
- **Low Sharpness**: Increase resolution or adjust focus
- **Motion Artifacts**: Check frame rate consistency
- **Color Inconsistencies**: Verify color grading pipeline

#### Audio Issues
- **Metallic Voice**: Regenerate with different TTS model
- **Low Clarity**: Improve signal-to-noise ratio
- **Audio Gaps**: Check audio synchronization

## Configuration

Edit `config.json` to customize validation settings:

```json
{
  "validation": {
    "mode": "batch",
    "quality_standard": "web_hd",
    "threshold": 70.0
  },
  "reporting": {
    "formats": ["json", "html"],
    "include_charts": true
  }
}
```

### Validation Modes

- **`batch`**: Comprehensive analysis (default)
- **`real_time`**: Fast validation for live feedback

### Quality Standards

- **`preview`**: Low quality for development
- **`web_hd`**: Standard web quality
- **`broadcast`**: High quality for professional use

## Sample Output

### Console Output
```
Quality Validation Demo
=======================

Validating project: quality_validation_demo

Video Validation:
✓ sample_video.mp4: PASSED (Quality: 85.2/100)

Audio Validation:
✓ sample_audio.wav: PASSED (Quality: 78.9/100)

Overall Assessment:
✓ Project passed validation (Average: 82.1/100)

Reports generated:
- reports/quality_report.json
- reports/quality_report.html
```

### JSON Report Structure
```json
{
  "report_type": "comprehensive_quality_validation",
  "project_name": "Quality Validation Demo",
  "metrics": {
    "total_shots": 1,
    "pass_rate": 100.0,
    "average_overall_score": 82.05,
    "issues_breakdown": {
      "critical": 0,
      "high": 0,
      "medium": 1,
      "low": 0
    }
  },
  "quality_scores": [...],
  "issues_summary": {...},
  "suggestions_summary": {...}
}
```

## Integration Examples

### Using in Your Pipeline

```python
from quality_validator import QualityValidator, ValidationMode

def validate_content(video_path, audio_path):
    validator = QualityValidator(mode=ValidationMode.BATCH)

    # Validate files
    video_ok, video_error = validator.validate_video_file(video_path)
    audio_ok, audio_error = validator.validate_audio_file(audio_path)

    if not (video_ok and audio_ok):
        return False, "File validation failed"

    # Quality assessment
    # ... load frames and audio data ...
    assessment = validator.assess_quality(frames)

    return assessment.passes_standard, assessment.overall_score
```

### Custom Quality Checks

```python
def custom_quality_gate(quality_score):
    """Custom quality gate logic."""
    if quality_score.overall_score < 70:
        return False, "Quality below threshold"

    critical_issues = [i for i in quality_score.issues
                      if i.severity == 'critical']
    if critical_issues:
        return False, f"Critical issues found: {len(critical_issues)}"

    return True, "Quality check passed"
```

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure StoryCore is properly installed
2. **File Not Found**: Check file paths and permissions
3. **Low Quality Scores**: Review source material and generation settings
4. **Memory Errors**: Reduce batch size for large files

### Debug Mode

Run with debug logging:

```bash
python demo_validation.py --debug
```

### Performance Tips

- Use `real_time` mode for quick checks
- Process large files in segments
- Cache validation results when possible
- Run validation on keyframes only for long videos

## Next Steps

- Integrate validation into your content pipeline
- Set up automated quality gates
- Customize thresholds for your use case
- Add custom validation rules
- Monitor quality trends over time

For detailed API documentation, see the [Quality Validation Developer Guide](../docs/quality_validation_developer_guide.md).