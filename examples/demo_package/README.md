# Fact-Checking System Demo Package

This demo package showcases the capabilities of the Scientific Fact-Checking & Multimedia Anti-Fake System for StoryCore-Engine.

## Contents

### 1. Sample Inputs
- `sample_scripts/` - Example text scripts with various factual claims
- `sample_transcripts/` - Example video transcripts for anti-fake analysis

### 2. Sample Reports
- `sample_reports/` - Pre-generated verification reports in JSON and Markdown formats

### 3. Demo Scripts
- `run_demo.py` - Interactive demo showcasing all system capabilities
- `quick_demo.py` - Quick 2-minute demonstration of core features

### 4. Demo Video Script
- `demo_video_script.md` - Script for creating a demo video

## Quick Start

### Run the Interactive Demo
```bash
python examples/demo_package/run_demo.py
```

This will:
1. Analyze sample text scripts for factual accuracy
2. Analyze sample video transcripts for manipulation signals
3. Demonstrate batch processing capabilities
4. Show caching and performance features
5. Display integration with StoryCore pipeline

### Run the Quick Demo
```bash
python examples/demo_package/quick_demo.py
```

A condensed 2-minute demonstration of the most important features.

## Demo Scenarios

### Scenario 1: Scientific Fact Verification
**Input**: Documentary script about climate science
**Demonstrates**:
- Claim extraction from narrative text
- Domain classification (physics, statistics)
- Confidence scoring
- Risk level assessment
- Evidence-based recommendations

### Scenario 2: Video Transcript Analysis
**Input**: News interview transcript
**Demonstrates**:
- Manipulation signal detection
- Coherence analysis
- Journalistic integrity scoring
- Timestamp-based problematic segment identification

### Scenario 3: Batch Processing
**Input**: Multiple scripts and transcripts
**Demonstrates**:
- Parallel processing with configurable concurrency
- Progress tracking
- Aggregate statistics

### Scenario 4: Pipeline Integration
**Input**: StoryCore project with fact-checking enabled
**Demonstrates**:
- Automatic verification at pipeline stages
- Non-blocking asynchronous execution
- High-risk warning events
- Data Contract v1 storage

## Sample Reports

All sample reports are available in both JSON and Markdown formats:

### Text Analysis Reports
- `climate_science_report.json` - High-confidence scientific claims
- `historical_claims_report.json` - Mixed confidence historical facts
- `statistics_report.json` - Statistical claims with evidence

### Video Analysis Reports
- `news_interview_report.json` - Manipulation signal detection
- `documentary_report.json` - High coherence, low risk
- `propaganda_report.json` - Multiple manipulation signals detected

## Performance Benchmarks

The demo includes performance testing:
- Text processing: < 30 seconds for 5000 words
- Transcript processing: < 60 seconds for 10000 words
- Cache retrieval: < 1 second
- Batch processing: Configurable concurrency

## System Requirements

- Python 3.9+
- StoryCore-Engine installed
- Dependencies from `requirements-fact-checker.txt`

## Demo Video

Follow the script in `demo_video_script.md` to create a video demonstration showing:
1. System overview and architecture (30 seconds)
2. Text fact-checking demo (60 seconds)
3. Video transcript analysis demo (60 seconds)
4. Pipeline integration demo (30 seconds)
5. Performance and features summary (30 seconds)

Total duration: ~3.5 minutes

## Support

For questions or issues with the demo:
- See main documentation: `src/fact_checker/README.md`
- Check integration guide: `src/fact_checker/PIPELINE_INTEGRATION_GUIDE.md`
- Review implementation status: `src/fact_checker/IMPLEMENTATION_STATUS.md`
