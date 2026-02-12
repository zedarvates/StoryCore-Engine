# StoryCore LLM Assistant Improvement Plan
## Based on Competitor Workflow Analysis

## Executive Summary

Based on analysis of competitor AI video assistants (including Flova/Zed Giller workflows), this plan identifies key improvements to enhance StoryCore's LLM assistant capabilities. The competitor demonstrates superior:
1. Hierarchical project organization with numbered elements
2. Segmented production workflow with checkpoints
3. Detailed visual asset management (reference images, keyframes)
4. Strategic model selection per scene type
5. Interactive user feedback integration

---

## 1. Hierarchical Project Structure Enhancement

### Current State
```
project/
├── project.json
├── scenes.json
├── characters.json
├── sequences.json
└── comfyui_config.json
```

### Proposed Structure (Competitor-Aligned)
```
project_La_Révélation_Reverend_Salace/
├── 01_elements/                    # Character & asset references
│   ├── 01_Reverend_Salace/
│   │   ├── element_reverend_salace.png
│   │   └── element_reverend_salace_mini.png
│   ├── 02_GaBy/
│   │   └── element_gaby.png
│   ├── 03_Judas/
│   ├── 04_Sylvain/
│   ├── 05_Jean/
│   ├── 06_Thomas/
│   ├── 07_Sea_Monster/
│   ├── 08_The_Guitar/
│   ├── 09_Goat_Mr_Seguin/
│   └── visual_references.md
├── 02_shots/                        # Keyframe images per shot
│   ├── 01_Intro_Cathedral/
│   │   ├── shot_01_keyframe.png
│   │   └── shot_01_endframe.png
│   ├── 02_Intro_Candles/
│   ├── 03_Salace_Rap_Close/
│   ├── 04_Salace_Pulpit/
│   └── ...
├── 03_videos/                       # Generated video clips
│   ├── shot_01_video.mp4
│   ├── shot_02_video.mp4
│   └── ...
├── 04_audio/                        # Audio assets
│   ├── music.mp3
│   ├── enhancement_main_bgm.mp3
│   └── enhancement_*.mp3
├── 05_sequences/                    # Assembled sequences
│   ├── segment_01_intro/
│   ├── segment_02_rap/
│   └── ...
├── project.json                      # Main metadata
├── storyboard.json                   # Detailed shot breakdown
├── creative_brief.json               # Project brief
└── visual_strategy.json              # Generation strategy

### Implementation Files
- `src/assistant/project_structure_manager.py` - New module for hierarchical organization
- `src/assistant/file_naming_conventions.py` - XXnumber_name format generator

---

## 2. Segmented Production Workflow with Checkpoints

### Current State
- Single-phase generation: `generate_project()` → `finalize_project()`
- No intermediate validation points

### Proposed Workflow (Competitor-Aligned)

#### Phase 1: Project Setup
```
User: "Create a music video for my heavy metal song"
Assistant:
  → Parse prompt
  → Create creative brief
  → Generate storyboard structure
  → Define visual generation strategy
  → PAUSE for user validation
```

#### Phase 2: Visual Assets Generation
```
Assistant (after approval):
  → Generate character reference images
  → Generate scene/location keyframes
  → PAUSE for user validation
```

#### Phase 3: Video Generation
```
Assistant (after approval):
  → Generate video clips segment by segment
  → Segment 1: Intro (cathedral)
  → Segment 2: First rap verse
  → Segment 3: Bridge/lyrics
  → ...
  → PAUSE between segments or after quality issues
```

#### Phase 4: Assembly & Enhancement
```
Assistant (after all clips approved):
  → Assemble timeline
  → Generate/enhance audio (BGM, SFX, voice)
  → Final export
```

### Implementation Files
- `src/assistant/workflow_state_manager.py` - Track workflow phases
- `src/assistant/checkpoint_validator.py` - Validate before transitions
- `src/assistant/segment_producer.py` - Produce videos by segment

---

## 3. Detailed Shot & Scene Specification

### Current State
```python
class Shot:
    id: str
    number: int
    type: str  # wide, medium, close-up
    camera_movement: str
    duration: float
    description: str
    visual_style: str
```

### Proposed Enhanced Schema
```python
class ShotSpec:
    # Identification
    shot_id: str              # "shot_01", "shot_02a", etc.
    segment_id: str           # Parent segment
    time_range: Tuple[float, float]  # (start_ms, end_ms)
    
    # Visual Description
    shot_size: str            # EWS, WS, MS, CU, ECU
    camera_movement: str      # static, pan, tilt, dolly, crane, zoom, [cut]
    camera_details: str       # "slow zoom in", "rapid handheld"
    
    # Content
    description: str          # Detailed visual content
    action: str               # Key action happening
    characters: List[str]     # Present characters
    location: str             # Setting
    time_of_day: str          # Lighting context
    weather: Optional[str]     # Environmental effects
    
    # Audio Sync
    music_cue: str            # Music timestamp/phase
    vocals_type: Optional[str]  # rap, singing, growl, instrumental
    lyrics_reference: Optional[str]
    sfx_notes: Optional[str]  # Sound effect notes
    
    # Visual Assets
    keyframe_start: Optional[Path]
    keyframe_end: Optional[Path]
    reference_images: List[Path]
    
    # Technical
    duration_seconds: float
    aspect_ratio: str         # "16:9", "9:16", "1:1"
    frame_rate: int           # 24, 30, 60 fps
    
    # Status
    generation_status: str    # pending, generating, review, approved
    model_used: Optional[str]
    generation_notes: str
```

### Implementation Files
- `src/assistant/enhanced_shot_spec.py` - Enhanced shot model
- `src/assistant/scene_breakdown_engine.py` - Detailed scene analysis
- `src/assistant/shot_prompt_generator.py` - Generate detailed prompts

---

## 4. Strategic Model Selection System

### Current State
- Single model approach
- No model selection logic per scene type

### Proposed Multi-Model Strategy

| Scene Type | Primary Model | Alternative | Purpose |
|------------|---------------|------------|---------|
| Atmospheric/Cinematic | Seedance 1.5 Pro | FirstFrameVideo | Establishing shots, environments |
| Character Performance | OmniHuman 1.5 | ImageToVideoByAudio | Lip-sync, speaking, singing |
| Dynamic Action | Sora-2 | Kling 2.1 | Fast cuts, combat, movement |
| Transition/Effect | VideoInterp | Seedance | Start→End frame interpolation |
| Character Close-up | Nano Banana Pro | Seedream 4.0 | Reference image generation |
| Scene Keyframe | Nano Banana Pro | Gemini 2.5 | Keyframe image generation |
| BGM/Music | Audio Engine | External | Background music |
| Voice/Narration | ElevenLabs v2 | Qwen3-TTS | Voice synthesis |

### Implementation Files
- `src/assistant/model_selector.py` - Strategic model selection
- `src/assistant/generation_strategy.py` - Generation approach per segment
- `src/assistant/model_capability_registry.py` - Model capabilities database

---

## 5. Enhanced User Interaction Patterns

### Current State
```typescript
// LLMAssistant.tsx - Basic Q&A
switch (step) {
  case 'foundations': ...
  case 'rules': ...
  case 'culture': ...
}
```

### Proposed Interactive Patterns

#### Pattern 1: Confirmation Points
```python
# After each major step
await assistant.confirm_phase_completion(
    phase="visual_assets_generation",
    assets_generated=["element_gaby.png", "element_salace.png"],
    next_action="Animate segment 1"
)
```

#### Pattern 2: Quality Feedback Loop
```python
# User: "Quality is low, regenerate without narration"
assistant.regenerate_with_modification(
    target="final_video",
    modifications={"remove_narration": True, "model": "Sora-2"}
)
```

#### Pattern 3: Detailed Corrections
```python
# User: "GaBy hair should be blonde curly like video"
assistant.regenerate_element(
    element="element_gaby",
    correction_prompt="blonde mid-length curly hair as shown in reference video"
)
```

#### Pattern 4: Technical Specifications
```python
# User preferences stored per project
project_technical_specs = {
    "prompt_language": "japanese",
    "required_prompt_elements": [
        "高速なカット割り",  # Fast cut transitions
        "作画枚数多め",      # More animation frames
        "24fps",
        "セリフなし",        # No dialogue
        "字幕なし",          # No subtitles
        "効果音あり"         # Include SFX
    ],
    "camera_movement_rule": "dynamic_except_cuts",
    "cut_marker": "[cut]"
}
```

### Implementation Files
- `src/assistant/confirmation_workflow.py` - Checkpoint system
- `src/assistant/feedback_processor.py` - User correction handling
- `src/assistant/technical_specs_manager.py` - Per-project specs
- `src/assistant/regeneration_manager.py` - Smart regeneration

---

## 6. Visual Asset Management System

### Current State
- Limited reference image tracking
- No keyframe start/end management

### Proposed System

#### Asset Types
1. **Character Elements** (`01_elements/`)
   - Primary reference (full body)
   - Expression variants
   - Costume variants

2. **Scene Keyframes** (`02_shots/`)
   - Start frame (first image)
   - End frame (last image)
   - Reference images (style guides)

3. **Generated Videos** (`03_videos/`)
   - Raw clips
   - Quality variants

#### Asset Metadata
```json
{
  "asset_id": "element_gaby",
  "type": "character_reference",
  "generation_params": {
    "model": "Nano Banana Pro",
    "prompt": "Young male singer, blonde mid-length curly hair, white blazer...",
    "aspect_ratio": "16:9",
    "resolution": "2K"
  },
  "source_reference": "recording_video.mp4",
  "status": "approved",
  "created_at": "2026-02-08T18:00:00Z",
  "usage_count": 5,
  "variations": []
}
```

### Implementation Files
- `src/assistant/asset_registry.py` - Track all visual assets
- `src/assistant/asset_generator.py` - Generate with metadata
- `src/assistant/asset_locator.py` - Find/retrieve assets

---

## 7. Detailed Storyboard with Technical Specs

### Current State
- Basic scene → sequence → shot hierarchy
- Limited technical details

### Proposed Storyboard Format
```json
{
  "storyboard": {
    "project_name": "La Révélation du Reverend Salace",
    "duration": "4:27",
    "aspect_ratio": "16:9",
    "segments": [
      {
        "segment_id": "seg_01",
        "title": "Intro - Cathedral",
        "time_range": ["00:00.00", "00:16.80"],
        "shots": [
          {
            "shot_id": "shot_01",
            "time_range": ["00:00.00", "00:01.00"],
            "shot_size": "fixed",
            "camera": "static",
            "description": "Black screen, Zed Giller Musics logo",
            "music": "atmospheric intro silence",
            "dialogue": null
          },
          {
            "shot_id": "shot_02",
            "time_range": ["00:01.00", "00:16.80"],
            "shot_size": "wide",
            "camera": "static / slow motion",
            "description": "Stars, candelabras, dark silhouette. Cathedral atmosphere.",
            "music": "heavy riff intro",
            "dialogue": null,
            "visual_effects": ["candlelight", "slow motion"]
          }
        ]
      }
    ]
  }
}
```

### Implementation Files
- `src/assistant/storyboard_generator.py` - Generate detailed storyboards
- `src/assistant/segment_builder.py` - Build segments from analysis
- `src/assistant/timecode_manager.py` - Handle timecode formatting

---

## Implementation Priority

### Phase 1: Foundation (Week 1)
- [ ] Enhanced project structure implementation
- [ ] Detailed shot specification model
- [ ] Asset management system

### Phase 2: Workflow (Week 2)
- [ ] Segmented production workflow
- [ ] Checkpoint/validation system
- [ ] User interaction improvements

### Phase 3: Intelligence (Week 3)
- [ ] Strategic model selection
- [ ] Technical specs manager
- [ ] Regeneration handling

### Phase 4: Polish (Week 4)
- [ ] Detailed storyboard generation
- [ ] Comprehensive prompt building
- [ ] Integration testing

---

## Files to Create/Modify

### New Files
1. `src/assistant/project_structure_manager.py`
2. `src/assistant/workflow_state_manager.py`
3. `src/assistant/segment_producer.py`
4. `src/assistant/enhanced_shot_spec.py`
5. `src/assistant/scene_breakdown_engine.py`
6. `src/assistant/shot_prompt_generator.py`
7. `src/assistant/model_selector.py`
8. `src/assistant/generation_strategy.py`
9. `src/assistant/asset_registry.py`
10. `src/assistant/asset_generator.py`
11. `src/assistant/confirmation_workflow.py`
12. `src/assistant/feedback_processor.py`
13. `src/assistant/regeneration_manager.py`
14. `src/assistant/technical_specs_manager.py`
15. `src/assistant/storyboard_generator.py`
16. `src/assistant/segment_builder.py`
17. `src/assistant/timecode_manager.py`
18. `src/assistant/model_capability_registry.py`

### Modified Files
1. `src/assistant/models.py` - Add enhanced models
2. `src/assistant/storycore_assistant.py` - Integrate new workflows
3. `src/assistant/project_generator.py` - Enhanced generation
4. `src/assistant/prompt_parser.py` - Technical specs parsing
5. `creative-studio-ui/src/components/wizard/world-builder/LLMAssistant.tsx` - Enhanced UI

---

## Success Metrics

1. **User Satisfaction**: Reduce regeneration requests by 50%
2. **Quality**: 90%+ first-try acceptance rate
3. **Efficiency**: 30% faster project completion
4. **Consistency**: 100% character/scene consistency across project
5. **Flexibility**: Support for all competitor workflows

---

## Risk Mitigation

1. **Complexity Risk**: Phased implementation to validate each component
2. **Performance Risk**: Asset caching and lazy loading
3. **Compatibility Risk**: Maintain backward compatibility with existing projects
4. **User Adoption Risk**: Gradual rollout with clear documentation

