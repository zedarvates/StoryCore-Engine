# Demo Video Script - Fact-Checking System

**Total Duration**: ~3.5 minutes  
**Target Audience**: Technical evaluators, content creators, developers

---

## Scene 1: Introduction (30 seconds)

**Visual**: Title card with system logo and name

**Narration**:
"Welcome to the Scientific Fact-Checking and Multimedia Anti-Fake System for StoryCore-Engine. This system provides automated content verification through two specialized AI agents, helping creators ensure factual accuracy and detect manipulation in their content."

**On-Screen Text**:
- Scientific Fact-Checking
- Manipulation Detection
- Pipeline Integration

---

## Scene 2: Text Fact-Checking Demo (60 seconds)

**Visual**: Screen recording of CLI running text analysis

**Narration**:
"Let's start with text fact-checking. We'll analyze a documentary script about climate science. The Scientific Audit Agent extracts factual claims, classifies them by domain, and evaluates their validity using evidence-based reasoning."

**Show**:
1. Input script preview (5 seconds)
2. Command execution: `python -m fact_checker.cli text climate_science.txt` (5 seconds)
3. Processing animation (10 seconds)
4. Results display (40 seconds):
   - Claims extracted: 15
   - Average confidence: 87.3%
   - High risk claims: 1
   - Domains: physics, statistics, general
   - Sample claim with evidence

**On-Screen Highlights**:
- Confidence scores
- Risk levels (color-coded)
- Evidence sources

---

## Scene 3: Video Transcript Analysis Demo (60 seconds)

**Visual**: Screen recording of video analysis

**Narration**:
"Next, the Anti-Fake Video Agent analyzes video transcripts for manipulation signals. Watch as it detects logical inconsistencies, emotional manipulation, and narrative bias in this news interview."

**Show**:
1. Transcript preview (5 seconds)
2. Command execution (5 seconds)
3. Processing (10 seconds)
4. Results (40 seconds):
   - Coherence score: 42%
   - Integrity score: 38%
   - Risk level: HIGH
   - 8 manipulation signals detected
   - Problematic segments with timestamps

**On-Screen Highlights**:
- Manipulation signal types
- Timestamp markers
- Risk assessment

---

## Scene 4: Pipeline Integration (30 seconds)

**Visual**: Architecture diagram with animation

**Narration**:
"The system integrates seamlessly with StoryCore-Engine through pipeline hooks. Verification runs automatically at key stages - before generation, after generation, and before publishing - without blocking your workflow."

**Show**:
- Pipeline flow diagram
- Hook configuration example
- Non-blocking execution visualization
- Data Contract v1 storage

---

## Scene 5: Performance & Features (30 seconds)

**Visual**: Feature summary with metrics

**Narration**:
"Key features include: sub-30-second processing for text, sub-60-second for transcripts, intelligent caching for instant repeated queries, batch processing with parallel execution, and comprehensive JSON and Markdown reports."

**Show**:
- Performance metrics
- Caching demo (speedup visualization)
- Batch processing progress
- Sample reports

**On-Screen Text**:
- ✓ Fast: < 30s for text, < 60s for video
- ✓ Smart: Caching & batch processing
- ✓ Integrated: Pipeline hooks
- ✓ Comprehensive: JSON & Markdown reports

---

## Scene 6: Closing (10 seconds)

**Visual**: Contact information and resources

**Narration**:
"Try the interactive demo, explore the documentation, and integrate fact-checking into your StoryCore workflow today."

**On-Screen Text**:
- Run: `python examples/demo_package/run_demo.py`
- Docs: `src/fact_checker/README.md`
- GitHub: [repository link]

---

## Production Notes

### Recording Setup
- Screen resolution: 1920x1080
- Terminal: Dark theme with high contrast
- Font size: 14-16pt for readability
- Cursor highlighting enabled

### Editing Notes
- Add subtle background music (low volume)
- Use smooth transitions between scenes
- Highlight important text with zoom or color
- Add progress indicators during processing
- Include captions for accessibility

### Assets Needed
- System logo/title card
- Architecture diagram (pipeline integration)
- Sample input files (provided in demo_package)
- Terminal recordings (record with asciinema or similar)

### Voice-Over Tips
- Clear, professional tone
- Moderate pace (not too fast)
- Emphasize key features and benefits
- Pause briefly between sections

---

## Alternative: Quick 90-Second Version

For a shorter demo, combine scenes:
1. Introduction (15s)
2. Combined text + video demo (45s)
3. Features summary (20s)
4. Closing (10s)

Focus on visual results rather than detailed explanations.
