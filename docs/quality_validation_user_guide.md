# Quality Validation User Guide

## Overview

The StoryCore quality validation system provides comprehensive assessment of video and audio content to ensure professional standards are met. This guide explains how to use the quality validation features through CLI commands, understand quality metrics and thresholds, and interpret validation reports.

## CLI Commands

### Basic Validation Command

```bash
storycore validate [OPTIONS]
```

#### Command Options

| Option | Description | Default | Examples |
|--------|-------------|---------|----------|
| `--project PATH` | Project directory to validate | Current directory (.) | `--project ./my-project` |
| `--scope SCOPE` | Validation scope(s) | `structure`, `config` | `--scope quality visual audio` |
| `--quality-threshold FLOAT` | Quality score threshold (0-100) | 70.0 | `--quality-threshold 80.0` |
| `--format FORMAT` | Output format | `human` | `--format json` |
| `--strict` | Enable strict validation mode | Disabled | `--strict` |
| `--fix` | Attempt automatic fixes | Disabled | `--fix` |

#### Validation Scopes

- **`structure`**: Validate project directory structure and required files
- **`config`**: Validate configuration files and settings
- **`quality`**: Comprehensive quality validation (includes visual and audio)
- **`visual`**: Video file validation and quality assessment
- **`audio`**: Audio file validation and quality assessment

### Examples

#### 1. Basic Project Validation
```bash
storycore validate
```
Validates project structure and configuration in current directory.

#### 2. Quality Validation Only
```bash
storycore validate --scope quality --format json
```
Performs comprehensive quality validation and outputs results in JSON format.

#### 3. Visual Quality Check with Custom Threshold
```bash
storycore validate --scope visual --quality-threshold 85.0
```
Validates video files with a quality threshold of 85/100.

#### 4. Full Validation with Auto-Fix
```bash
storycore validate --scope structure config quality --fix --strict
```
Runs complete validation across all scopes, attempts automatic fixes, and uses strict mode.

#### 5. Audio Quality Assessment
```bash
storycore validate --scope audio --format json --quality-threshold 75.0
```
Validates audio files with detailed JSON output and 75% threshold.

## Quality Metrics and Thresholds

### Quality Standards

The system supports three quality standards, each with different thresholds:

| Standard | Description | Typical Use Case | Default Threshold |
|----------|-------------|------------------|-------------------|
| **PREVIEW** | Low quality for quick previews | Development/testing | 50% |
| **WEB_HD** | Standard web quality | Web content/delivery | 70% |
| **BROADCAST** | High quality for broadcast | Professional production | 90% |

### Quality Metrics

#### Visual Quality Metrics

| Metric | Description | Range | Weight |
|--------|-------------|-------|--------|
| **Visual Quality** | Overall visual fidelity | 0-1 | 30% |
| **Motion Smoothness** | Natural motion without artifacts | 0-1 | 25% |
| **Sharpness** | Image clarity and focus | 0-1 | 25% |
| **Noise Level** | Visual noise and grain | 0-1 (lower is better) | 20% |
| **Professional Standards** | Compliance with broadcast standards | 0-1 | 10% (advanced mode only) |

#### Audio Quality Metrics

| Metric | Description | Range |
|--------|-------------|-------|
| **Voice Clarity** | Speech intelligibility (SNR-based) | 0-100 |
| **Audio Quality Score** | Overall audio assessment | 0-100 |
| **Metallic Voice Detection** | AI artifact detection | Binary (0-1) |

### Default Thresholds

- **Overall Quality Score**: 70/100 (70%)
- **Sharpness**: 100 (varies by mode)
  - Real-time mode: 80
  - Batch mode: 100
- **Voice Clarity**: 30/100 (30%)

### Quality Score Calculation

The overall quality score is calculated as a weighted average:

```
Overall Score = (Visual Quality × 0.3) +
                (Motion Smoothness × 0.25) +
                (Sharpness × 0.25) +
                (Audio Quality × 0.25) +
                (Continuity Score × 0.2)
```

## Interpreting Quality Reports

### Report Types

#### 1. Human-Readable Format (Default)

```
Validating project in: /path/to/project
Validation scopes: structure, config, quality

Structure/Config Validation:
[PASS] config.json: PASSED
[PASS] assets/: PASSED

Quality Validation:
[PASS] Visual quality: PASSED (5/5 videos valid)
[PASS] Audio quality: PASSED (3/3 files valid)

SUCCESS: All validations passed!
```

#### 2. JSON Format

```json
{
  "project": "/path/to/project",
  "scopes": ["structure", "config", "quality"],
  "structure_validation": {
    "config.json": {"status": "passed"},
    "assets/": {"status": "passed"}
  },
  "quality_validation": {
    "visual": {
      "passed": true,
      "videos_checked": 5,
      "valid_videos": 5,
      "message": "Visual validation completed: 5/5 videos valid"
    },
    "audio": {
      "passed": true,
      "audio_files_checked": 3,
      "valid_audio_files": 3,
      "message": "Audio validation completed: 3/3 files valid"
    }
  },
  "overall_passed": true,
  "exit_code": 0
}
```

#### 3. HTML Reports (Generated Separately)

HTML reports include:
- Interactive charts showing quality trends
- Detailed metrics breakdown
- Color-coded issue severity
- Visual representations of improvements

### Understanding Report Sections

#### Summary Metrics
- **Total Shots**: Number of video clips evaluated
- **Pass Rate**: Percentage of clips meeting quality standards
- **Average Score**: Mean quality score across all clips
- **Total Issues**: Number of quality issues detected

#### Issues Breakdown by Severity

| Severity | Description | Action Required |
|----------|-------------|-----------------|
| **Critical** | Major quality problems | Immediate attention required |
| **High** | Significant issues | Fix before production |
| **Medium** | Moderate issues | Address when possible |
| **Low** | Minor issues | Optional improvements |

#### Common Issue Types

**Visual Issues:**
- `low_sharpness`: Blurry or out-of-focus content
- `unnatural_motion`: Jerky or artificial movement
- `sudden_change`: Abrupt brightness/color changes

**Audio Issues:**
- `metallic_voice`: AI-generated speech artifacts
- `low_clarity`: Poor signal-to-noise ratio
- `audio_gap`: Silence or missing audio segments

### Quality Score Interpretation

| Score Range | Quality Level | Description |
|-------------|---------------|-------------|
| 90-100 | Excellent | Professional broadcast quality |
| 80-89 | Very Good | High-quality web content |
| 70-79 | Good | Acceptable web quality |
| 60-69 | Fair | Needs improvement |
| 50-59 | Poor | Significant issues |
| 0-49 | Unacceptable | Major rework required |

### Recommendations

Reports include specific improvement suggestions:
- **Priority 1**: Critical fixes (regenerate content, adjust parameters)
- **Priority 2**: Important improvements (quality settings, model selection)
- **Priority 3**: Optional enhancements (fine-tuning)

### Auto-Fix Results

When using `--fix`, the system attempts automatic corrections:
- **Fixed Issues**: Successfully resolved problems
- **Remaining Issues**: Problems requiring manual intervention
- **Improvement Delta**: Quality score improvement after fixes

## Troubleshooting

### Common Issues

#### Validation Fails with "No video files found"
- Ensure video files are in supported formats: `.mp4`, `.avi`, `.mov`, `.mkv`, `.webm`
- Check file permissions and paths

#### Quality scores are lower than expected
- Verify quality standard settings match your requirements
- Check for encoding artifacts or compression issues
- Review source material quality

#### Audio validation errors
- Ensure audio files are in supported formats: `.wav`, `.mp3`, `.flac`, `.aac`, `.ogg`
- Check for corrupted audio data or invalid sample rates

#### Performance issues during validation
- Use `--scope` to limit validation to specific areas
- Consider batch processing for large projects
- Real-time mode provides faster but less comprehensive validation

### Getting Help

For additional assistance:
1. Run `storycore validate --help` for detailed command options
2. Check the developer documentation for API usage
3. Review example projects for implementation patterns