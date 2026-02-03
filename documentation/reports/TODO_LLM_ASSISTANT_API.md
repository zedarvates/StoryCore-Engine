# StoryCore LLM Assistant API Documentation

## Overview
Implementation of a comprehensive LLM assistant system for intelligent project creation from prompts, including world building, character generation, story/script creation, dialogue generation, sequence planning with timing and image prompts, music/sound descriptions, and aspect ratio/duration control.

## API Examples

### Parse Prompt

**Endpoint:** `POST /llm/parse-prompt`

**Request:**
```json
{
  "prompt": "Create a cyberpunk trailer set in a neon city with corrupt AI and surveillance drones, featuring seven augmented mercenaries on a mission to save humanity from a dystopian future."
}
```

**Response:**
```json
{
  "success": true,
  "parsed": {
    "project_title": "Cyberpunk Future",
    "genre": "cyberpunk",
    "setting": "future",
    "time_period": "future",
    "location": "city",
    "mood": ["dark", "tense", "epic", "intense"],
    "tone": "dark",
    "video_type": "trailer",
    "aspect_ratio": "16:9",
    "duration_seconds": 60,
    "quality_tier": "preview",
    "key_elements": ["néon city", "IA corrompue", "drones de surveillance", "sept mercenaires augmentés"],
    "visual_references": [],
    "excluded_elements": [],
    "raw_prompt": "Create a cyberpunk trailer set in a neon city with corrupt AI and surveillance drones, featuring seven augmented mercenaries on a mission to save humanity from a dystopian future.",
    "confidence": 0.7,
    "characters": []
  },
  "confidence": 0.7
}
```

### Generate Project Name

**Endpoint:** `POST /llm/suggest-project-name`

**Request:**
```json
{
  "project_title": "Cyberpunk Future",
  "genre": "cyberpunk",
  "setting": "future",
  "key_elements": ["néon city", "IA corrompue", "drones de surveillance", "sept mercenaires augmentés"]
}
```

**Response:**
```json
{
  "success": true,
  "suggestions": [
    {
      "suggested_name": "Cyberpunk-Future",
      "version": null,
      "full_name": "Cyberpunk-Future",
      "is_duplicate": false,
      "project_path": "./Cyberpunk-Future"
    }
  ]
}
```

### Generate Sequences

**Endpoint:** `POST /llm/generate-sequences`

**Request:**
```json
{
  "prompt": "Create a cyberpunk trailer set in a neon city with corrupt AI and surveillance drones, featuring seven augmented mercenaries on a mission to save humanity from a dystopian future.",
  "parsed": {
    "project_title": "Cyberpunk Future",
    "genre": "cyberpunk",
    "setting": "future",
    "time_period": "future",
    "location": "city",
    "mood": ["dark", "tense", "epic", "intense"],
    "tone": "dark",
    "video_type": "trailer",
    "aspect_ratio": "16:9",
    "duration_seconds": 60,
    "quality_tier": "preview",
    "key_elements": ["néon city", "IA corrompue", "drones de surveillance", "sept mercenaires augmentés"],
    "visual_references": [],
    "excluded_elements": [],
    "raw_prompt": "Create a cyberpunk trailer set in a neon city with corrupt AI and surveillance drones, featuring seven augmented mercenaries on a mission to save humanity from a dystopian future.",
    "confidence": 0.7,
    "characters": []
  },
  "target_duration": 60,
  "aspect_ratio": "16:9"
}
```

**Response:**
```json
{
  "success": true,
  "plan": {
    "plan_id": "seq_20260124_202405",
    "project_title": "Cyberpunk Future",
    "created_at": "2026-01-24T20:24:05.287Z",
    "aspect_ratio": "16:9",
    "total_duration": 60,
    "total_shots": 3,
    "sequences": [
      {
        "shot_id": "shot_001",
        "sequence_number": 1,
        "shot_number": 1,
        "start_time": 0.0,
        "end_time": 20.0,
        "duration": 20.0,
        "shot_type": "ELS",
        "shot_type_name": "Extreme Long Shot",
        "purpose": "establish_environment",
        "camera": {
          "angle": "eye-level",
          "movement": "dolly-in",
          "lens": "wide"
        },
        "first_image_prompt": "extreme long shot, cyberpunk, future, dark, cinematic, 8k, highly detailed",
        "negative_prompt": "low quality, blurry, distorted, ugly, bad anatomy",
        "transition_in": "fade",
        "transition_out": "cut",
        "mood": "dark",
        "intensity": "low"
      },
      {
        "shot_id": "shot_002",
        "sequence_number": 2,
        "shot_number": 2,
        "start_time": 20.0,
        "end_time": 40.0,
        "duration": 20.0,
        "shot_type": "LS",
        "shot_type_name": "Long Shot",
        "purpose": "establish_scene",
        "camera": {
          "angle": "eye-level",
          "movement": "dolly-in",
          "lens": "wide"
        },
        "first_image_prompt": "long shot, cyberpunk, future, dark, cinematic, 8k, highly detailed",
        "negative_prompt": "low quality, blurry, distorted, ugly, bad anatomy",
        "transition_in": "cut",
        "transition_out": "cut",
        "mood": "dark",
        "intensity": "medium"
      },
      {
        "shot_id": "shot_003",
        "sequence_number": 3,
        "shot_number": 3,
        "start_time": 40.0,
        "end_time": 60.0,
        "duration": 20.0,
        "shot_type": "MCU",
        "shot_type_name": "Medium Close-Up",
        "purpose": "character_interaction",
        "camera": {
          "angle": "eye-level",
          "movement": "static",
          "lens": "normal"
        },
        "first_image_prompt": "medium close-up, cyberpunk, future, dark, cinematic, 8k, highly detailed",
        "negative_prompt": "low quality, blurry, distorted, ugly, bad anatomy",
        "transition_in": "cut",
        "transition_out": "fade",
        "mood": "dark",
        "intensity": "high"
      }
    ],
    "shot_type_distribution": {
      "ELS": 1,
      "LS": 1,
      "MCU": 1
    },
    "music_mood": "dark and atmospheric",
    "overall_mood": "dark"
  }
}
```

### Generate Music and Sound

**Endpoint:** `POST /llm/generate-music-sound`

**Request:**
```json
{
  "project_title": "Cyberpunk Future",
  "genre": "cyberpunk",
  "mood": ["dark", "tense", "epic", "intense"],
  "video_type": "trailer",
  "setting": "future",
  "time_period": "future",
  "target_duration": 60
}
```

**Response:**
```json
{
  "success": true,
  "music_description": {
    "track_id": "audio_20260124_202405",
    "track_name": "Dark Score",
    "mood": "dark",
    "genre": "Cinematic Score",
    "tempo": {
      "bpm": 130,
      "label": "fast"
    },
    "instruments": [
      {
        "name": "Synth Bass",
        "category": "electronic",
        "role": "bass"
      },
      {
        "name": "Analog Synth",
        "category": "electronic",
        "role": "pad"
      },
      {
        "name": "Drum Machine",
        "category": "percussion",
        "role": "rhythm"
      }
    ],
    "key": "C minor",
    "time_signature": "4/4",
    "structure": {
      "sections": [
        {
          "name": "Intro",
          "type": "intro",
          "bars": 8,
          "intensity": 30
        },
        {
          "name": "Verse",
          "type": "verse",
          "bars": 16,
          "intensity": 50
        },
        {
          "name": "Build",
          "type": "build",
          "bars": 8,
          "intensity": 75
        },
        {
          "name": "Climax",
          "type": "climax",
          "bars": 16,
          "intensity": 100
        },
        {
          "name": "Outro",
          "type": "outro",
          "bars": 8,
          "intensity": 40
        }
      ]
    },
    "intensity_curve": [
      {
        "time": 0,
        "value": 20,
        "label": "Opening"
      },
      {
        "time": 18,
        "value": 50,
        "label": "Development"
      },
      {
        "time": 36,
        "value": 70,
        "label": "Building"
      },
      {
        "time": 51,
        "value": 90,
        "label": "Climax"
      },
      {
        "time": 60,
        "value": 40,
        "label": "End"
      }
    ],
    "sound_design_elements": [
      {
        "name": "Ambient Sound",
        "category": "ambience",
        "timing": "continuous"
      }
    ],
    "atmosphere": "Dark Atmosphere",
    "total_duration": 60,
    "intro_duration": 8,
    "outro_duration": 5,
    "usage_notes": [
      "Use intro for establishing shots",
      "Build sections ideal for action sequences",
      "Climax section perfect for dramatic peaks"
    ]
  },
  "mixing_guide": {
    "music_volume_curve": [
      "Fade in",
      "Sustain",
      "Build",
      "Peak",
      "Fade out"
    ],
    "dialogue_duck_level": -6,
    "sfx_priority": [
      "Impact sounds",
      "Dialogue",
      "Music",
      "Ambience"
    ]
  }
}
```

### Create Project from Prompt

**Endpoint:** `POST /llm/create-project-from-prompt`

**Request:**
```json
{
  "prompt": "Create a cyberpunk trailer set in a neon city with corrupt AI and surveillance drones, featuring seven augmented mercenaries on a mission to save humanity from a dystopian future.",
  "project_name": "Cyberpunk Future",
  "generate_world": true,
  "generate_characters": true,
  "generate_story": true,
  "generate_dialogues": true,
  "generate_sequences": true,
  "generate_music": true
}
```

**Response:**
```json
{
  "success": true,
  "project_path": "./Cyberpunk Future",
  "project_name": "Cyberpunk Future",
  "parsed_prompt": {
    "project_title": "Cyberpunk Future",
    "genre": "cyberpunk",
    "setting": "future",
    "time_period": "future",
    "location": "city",
    "mood": ["dark", "tense", "epic", "intense"],
    "tone": "dark",
    "video_type": "trailer",
    "aspect_ratio": "16:9",
    "duration_seconds": 60,
    "quality_tier": "preview",
    "key_elements": ["néon city", "IA corrompue", "drones de surveillance", "sept mercenaires augmentés"],
    "visual_references": [],
    "excluded_elements": [],
    "raw_prompt": "Create a cyberpunk trailer set in a neon city with corrupt AI and surveillance drones, featuring seven augmented mercenaries on a mission to save humanity from a dystopian future.",
    "confidence": 0.7,
    "characters": []
  },
  "world_config": {
    "world_id": "world_cyberpunk_future",
    "name": "Cyberpunk Future",
    "genre": "cyberpunk",
    "setting": "future",
    "time_period": "future",
    "location": "city"
  },
  "characters": [],
  "story": null,
  "dialogues": null,
  "sequences": {
    "plan_id": "seq_20260124_202405",
    "project_title": "Cyberpunk Future",
    "created_at": "2026-01-24T20:24:05.287Z",
    "aspect_ratio": "16:9",
    "total_duration": 60,
    "total_shots": 3,
    "sequences": [
      {
        "shot_id": "shot_001",
        "sequence_number": 1,
        "shot_number": 1,
        "start_time": 0.0,
        "end_time": 20.0,
        "duration": 20.0,
        "shot_type": "ELS",
        "shot_type_name": "Extreme Long Shot",
        "purpose": "establish_environment",
        "camera": {
          "angle": "eye-level",
          "movement": "dolly-in",
          "lens": "wide"
        },
        "first_image_prompt": "extreme long shot, cyberpunk, future, dark, cinematic, 8k, highly detailed",
        "negative_prompt": "low quality, blurry, distorted, ugly, bad anatomy",
        "transition_in": "fade",
        "transition_out": "cut",
        "mood": "dark",
        "intensity": "low"
      },
      {
        "shot_id": "shot_002",
        "sequence_number": 2,
        "shot_number": 2,
        "start_time": 20.0,
        "end_time": 40.0,
        "duration": 20.0,
        "shot_type": "LS",
        "shot_type_name": "Long Shot",
        "purpose": "establish_scene",
        "camera": {
          "angle": "eye-level",
          "movement": "dolly-in",
          "lens": "wide"
        },
        "first_image_prompt": "long shot, cyberpunk, future, dark, cinematic, 8k, highly detailed",
        "negative_prompt": "low quality, blurry, distorted, ugly, bad anatomy",
        "transition_in": "cut",
        "transition_out": "cut",
        "mood": "dark",
        "intensity": "medium"
      },
      {
        "shot_id": "shot_003",
        "sequence_number": 3,
        "shot_number": 3,
        "start_time": 40.0,
        "end_time": 60.0,
        "duration": 20.0,
        "shot_type": "MCU",
        "shot_type_name": "Medium Close-Up",
        "purpose": "character_interaction",
        "camera": {
          "angle": "eye-level",
          "movement": "static",
          "lens": "normal"
        },
        "first_image_prompt": "medium close-up, cyberpunk, future, dark, cinematic, 8k, highly detailed",
        "negative_prompt": "low quality, blurry, distorted, ugly, bad anatomy",
        "transition_in": "cut",
        "transition_out": "fade",
        "mood": "dark",
        "intensity": "high"
      }
    ],
    "shot_type_distribution": {
      "ELS": 1,
      "LS": 1,
      "MCU": 1
    },
    "music_mood": "dark and atmospheric",
    "overall_mood": "dark"
  },
  "music": {
    "track_id": "audio_20260124_202405",
    "track_name": "Dark Score",
    "mood": "dark",
    "genre": "Cinematic Score",
    "tempo": {
      "bpm": 130,
      "label": "fast"
    },
    "instruments": [
      {
        "name": "Synth Bass",
        "category": "electronic",
        "role": "bass"
      },
      {
        "name": "Analog Synth",
        "category": "electronic",
        "role": "pad"
      },
      {
        "name": "Drum Machine",
        "category": "percussion",
        "role": "rhythm"
      }
    ],
    "key": "C minor",
    "time_signature": "4/4",
    "structure": {
      "sections": [
        {
          "name": "Intro",
          "type": "intro",
          "bars": 8,
          "intensity": 30
        },
        {
          "name": "Verse",
          "type": "verse",
          "bars": 16,
          "intensity": 50
        },
        {
          "name": "Build",
          "type": "build",
          "bars": 8,
          "intensity": 75
        },
        {
          "name": "Climax",
          "type": "climax",
          "bars": 16,
          "intensity": 100
        },
        {
          "name": "Outro",
          "type": "outro",
          "bars": 8,
          "intensity": 40
        }
      ]
    },
    "intensity_curve": [
      {
        "time": 0,
        "value": 20,
        "label": "Opening"
      },
      {
        "time": 18,
        "value": 50,
        "label": "Development"
      },
      {
        "time": 36,
        "value": 70,
        "label": "Building"
      },
      {
        "time": 51,
        "value": 90,
        "label": "Climax"
      },
      {
        "time": 60,
        "value": 40,
        "label": "End"
      }
    ],
    "sound_design_elements": [
      {
        "name": "Ambient Sound",
        "category": "ambience",
        "timing": "continuous"
      }
    ],
    "atmosphere": "Dark Atmosphere",
    "total_duration": 60,
    "intro_duration": 8,
    "outro_duration": 5,
    "usage_notes": [
      "Use intro for establishing shots",
      "Build sections ideal for action sequences",
      "Climax section perfect for dramatic peaks"
    ]
  },
  "message": "Project 'Cyberpunk Future' created successfully at ./Cyberpunk Future"
}
```

## Files to Create

### Phase 1: Core LLM Modules
- [x] `src/llm/prompt-parser.ts` - Parse complex creative prompts (200 lines)
- [x] `src/llm/project-name-generator.ts` - Smart name generation with versioning (150 lines)
- [x] `src/llm/world-config-generator.ts` - World builder configuration (200 lines)
- [ ] `src/llm/character-generator.ts` - Character generation from prompt (250 lines)
- [ ] `src/llm/story-generator.ts` - Script/story generation (250 lines)
- [ ] `src/llm/dialogue-generator.ts` - Dialogue generation (200 lines)
- [x] `src/llm/sequence-planner.ts` - Shot sequences + timing + image prompts (350 lines)
- [x] `src/llm/music-sound-generator.ts` - Audio descriptions/suggestions (350 lines)

### Phase 2: API & Pipeline
- [ ] `src/project_templates.py` - Dynamic templates with aspect ratio/duration
- [ ] `src/api/llm_assistant_routes.py` - FastAPI endpoints
- [ ] `src/project_pipeline_manager.py` - Orchestrate full pipeline

## Features

### Prompt Parser
- Extract: genre, setting, characters, mood, style, key elements
- Detect video type (trailer, teaser, short film, etc.)
- Identify target aspect ratio and duration
- Parse cinematic style references

### Project Name Generator
- Generate names from prompt content
- Handle duplicates with V2, V3... versioning
- Validate project path existence

### World Config Generator
- World type selection (fantasy, sci-fi, modern, historical)
- Visual identity and color palettes
- Geographic features
- Cultural elements
- Atmospheric settings

### Character Generator
- Character profiles from prompt
- Visual attributes, color palettes
- Personality traits, roles
- Relationships and interactions

### Story Generator
- Narrative structure (3-act, trailer structure, etc.)
- Scene breakdowns
- Emotional arcs
- Key beats and timing

### Dialogue Generator
- Voice-over scripts
- Character dialogue lines
- Timing markers
- Style consistency

### Sequence Planner
- Shot-by-shot breakdown
- Camera: movement, angle, lens
- Timing and duration per shot
- **First image prompt** for ComfyUI
- Transitions
- Aspect ratio: 16:9, 9:16, 1:1, 4:3, 21:9
- Duration control with auto-detection

### Music/Sound Generator
- Music mood description
- Instrument suggestions
- Tempo and beat markers
- Sound design elements
- Intensity curve

### Project Templates
- Dynamic templates based on parsed prompt
- Aspect ratio configuration
- Duration calculation
- Quality tiers (draft, preview, final)

### API Routes
- `POST /v1/llm/parse-prompt` - Parse prompt → structured data
- `POST /v1/llm/suggest-project-name` - Generate name
- `POST /v1/llm/create-project-from-prompt` - Full pipeline
- `POST /v1/llm/generate-world` - World generation
- `POST /v1/llm/generate-characters` - Character generation
- `POST /v1/llm/generate-story` - Script generation
- `POST /v1/llm/generate-dialogues` - Dialogue generation
- `POST /v1/llm/generate-sequences` - Sequence planning
- `POST /v1/llm/generate-music-sound` - Audio descriptions

### Pipeline Manager
- Orchestrate full project creation workflow
- Step-by-step user confirmation
- Progress tracking
- Error handling and recovery

## Progress

### Phase 1: Core LLM Modules
- [ ] prompt-parser.ts
- [ ] project-name-generator.ts
- [ ] world-config-generator.ts
- [ ] character-generator.ts
- [ ] story-generator.ts
- [ ] dialogue-generator.ts
- [ ] sequence-planner.ts
- [ ] music-sound-generator.ts

### Phase 2: API & Pipeline
- [ ] project_templates.py
- [ ] llm_assistant_routes.py
- [ ] project_pipeline_manager.py

## Integration Points
- Uses existing `LLMProviderManager` for intelligent parsing
- Uses `WorldGenerationEngine` patterns
- Uses `ScriptEngine` for story structure
- Uses `ShotEngine` for sequence planning
- Uses `VideoPlanEngine` for video plan format
- Uses `CharacterWizardOrchestrator` patterns

## Total Lines of Code
- ~2,650 lines across 11 files

## Created
Date: 2026-01-24

## Files to Create

### Phase 1: Core LLM Modules
- [x] `src/llm/prompt-parser.ts` - Parse complex creative prompts (200 lines)
- [x] `src/llm/project-name-generator.ts` - Smart name generation with versioning (150 lines)
- [x] `src/llm/world-config-generator.ts` - World builder configuration (200 lines)
- [ ] `src/llm/character-generator.ts` - Character generation from prompt (250 lines)
- [ ] `src/llm/story-generator.ts` - Script/story generation (250 lines)
- [ ] `src/llm/dialogue-generator.ts` - Dialogue generation (200 lines)
- [x] `src/llm/sequence-planner.ts` - Shot sequences + timing + image prompts (350 lines)
- [x] `src/llm/music-sound-generator.ts` - Audio descriptions/suggestions (350 lines)

### Phase 2: API & Pipeline
- [ ] `src/project_templates.py` - Dynamic templates with aspect ratio/duration
- [ ] `src/api/llm_assistant_routes.py` - FastAPI endpoints
- [ ] `src/project_pipeline_manager.py` - Orchestrate full pipeline

## Features

### Prompt Parser
- Extract: genre, setting, characters, mood, style, key elements
- Detect video type (trailer, teaser, short film, etc.)
- Identify target aspect ratio and duration
- Parse cinematic style references

### Project Name Generator
- Generate names from prompt content
- Handle duplicates with V2, V3... versioning
- Validate project path existence

### World Config Generator
- World type selection (fantasy, sci-fi, modern, historical)
- Visual identity and color palettes
- Geographic features
- Cultural elements
- Atmospheric settings

### Character Generator
- Character profiles from prompt
- Visual attributes, color palettes
- Personality traits, roles
- Relationships and interactions

### Story Generator
- Narrative structure (3-act, trailer structure, etc.)
- Scene breakdowns
- Emotional arcs
- Key beats and timing

### Dialogue Generator
- Voice-over scripts
- Character dialogue lines
- Timing markers
- Style consistency

### Sequence Planner
- Shot-by-shot breakdown
- Camera: movement, angle, lens
- Timing and duration per shot
- **First image prompt** for ComfyUI
- Transitions
- Aspect ratio: 16:9, 9:16, 1:1, 4:3, 21:9
- Duration control with auto-detection

### Music/Sound Generator
- Music mood description
- Instrument suggestions
- Tempo and beat markers
- Sound design elements
- Intensity curve

### Project Templates
- Dynamic templates based on parsed prompt
- Aspect ratio configuration
- Duration calculation
- Quality tiers (draft, preview, final)

### API Routes
- `POST /v1/llm/parse-prompt` - Parse prompt → structured data
- `POST /v1/llm/suggest-project-name` - Generate name
- `POST /v1/llm/create-project-from-prompt` - Full pipeline
- `POST /v1/llm/generate-world` - World generation
- `POST /v1/llm/generate-characters` - Character generation
- `POST /v1/llm/generate-story` - Script generation
- `POST /v1/llm/generate-dialogues` - Dialogue generation
- `POST /v1/llm/generate-sequences` - Sequence planning
- `POST /v1/llm/generate-music-sound` - Audio descriptions

### Pipeline Manager
- Orchestrate full project creation workflow
- Step-by-step user confirmation
- Progress tracking
- Error handling and recovery

## Progress

### Phase 1: Core LLM Modules
- [ ] prompt-parser.ts
- [ ] project-name-generator.ts
- [ ] world-config-generator.ts
- [ ] character-generator.ts
- [ ] story-generator.ts
- [ ] dialogue-generator.ts
- [ ] sequence-planner.ts
- [ ] music-sound-generator.ts

### Phase 2: API & Pipeline
- [ ] project_templates.py
- [ ] llm_assistant_routes.py
- [ ] project_pipeline_manager.py

## Integration Points
- Uses existing `LLMProviderManager` for intelligent parsing
- Uses `WorldGenerationEngine` patterns
- Uses `ScriptEngine` for story structure
- Uses `ShotEngine` for sequence planning
- Uses `VideoPlanEngine` for video plan format
- Uses `CharacterWizardOrchestrator` patterns

## Total Lines of Code
- ~2,650 lines across 11 files

## Created
Date: 2026-01-24

